/**
 * @file reviewOverviewUtils.ts
 * @input Daily, weekly, and monthly review records plus review templates
 * @output Grouped review-question overview data and newest-first answer histories
 * @pos Utils (Review Overview)
 * @description Builds the settings Review Overview hierarchy from persisted review answers while preserving historical template snapshots.
 * @created 2026-08-09
 * @updated 2026-08-09: Added review overview grouping utilities.
 * @updated 2026-08-09: Carries review question display metadata and sorts questions/groups by latest answer.
 */

import type {
  DailyReview,
  MonthlyReview,
  QuestionType,
  ReviewAnswer,
  ReviewQuestion,
  ReviewTemplate,
  ReviewTemplateSnapshot,
  WeeklyReview
} from '../types';

export type ReviewOverviewKind = 'daily' | 'weekly' | 'monthly';

export interface ReviewOverviewAnswer {
  id: string;
  reviewId: string;
  kind: ReviewOverviewKind;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  sortDate: string;
  answer: string;
  updatedAt: number;
}

export interface ReviewOverviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  choices?: string[];
  icon?: string;
  colorId?: string;
  groupTitle: string;
  order: number;
  answers: ReviewOverviewAnswer[];
  answerCount: number;
  latestAnswer?: ReviewOverviewAnswer;
}

export interface ReviewOverviewTemplateGroup {
  id: string;
  title: string;
  order: number;
  questions: ReviewOverviewQuestion[];
  answerCount: number;
  latestAnswer?: ReviewOverviewAnswer;
}

export interface ReviewOverviewSection {
  kind: ReviewOverviewKind;
  title: string;
  groups: ReviewOverviewTemplateGroup[];
  answerCount: number;
  questionCount: number;
}

export interface BuildReviewOverviewParams {
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  reviewTemplates: ReviewTemplate[];
}

type ReviewRecord = DailyReview | WeeklyReview | MonthlyReview;

interface ReviewDescriptor {
  kind: ReviewOverviewKind;
  title: string;
  reviews: ReviewRecord[];
}

interface QuestionDisplayMetadata {
  groupTitle: string;
  question: string;
  groupOrder: number;
  questionOrder: number;
  type: QuestionType;
  choices?: string[];
  icon?: string;
  colorId?: string;
}

interface TemplateLookup {
  templates: ReviewTemplateSnapshot[];
  byQuestionId: Map<string, QuestionDisplayMetadata>;
  byQuestionText: Map<string, QuestionDisplayMetadata>;
}

const UNGROUPED_TITLE = '未分组';

const normalizeTextKey = (value: string): string => (
  value.trim().replace(/\s+/g, ' ').toLowerCase()
);

const makeGroupKey = (kind: ReviewOverviewKind, title: string): string => (
  `${kind}:${normalizeTextKey(title)}`
);

const makeQuestionKey = (
  kind: ReviewOverviewKind,
  groupTitle: string,
  question: string
): string => (
  `${kind}:${normalizeTextKey(groupTitle)}:${normalizeTextKey(question)}`
);

const makeAnswerId = (
  kind: ReviewOverviewKind,
  reviewId: string,
  answer: ReviewAnswer,
  index: number
): string => (
  `${kind}:${reviewId}:${answer.questionId || normalizeTextKey(answer.question)}:${index}`
);

const getTemplateFlag = (kind: ReviewOverviewKind): keyof Pick<ReviewTemplate, 'isDailyTemplate' | 'isWeeklyTemplate' | 'isMonthlyTemplate'> => {
  if (kind === 'weekly') {
    return 'isWeeklyTemplate';
  }

  if (kind === 'monthly') {
    return 'isMonthlyTemplate';
  }

  return 'isDailyTemplate';
};

const getCurrentTemplatesForKind = (
  kind: ReviewOverviewKind,
  reviewTemplates: ReviewTemplate[]
): ReviewTemplateSnapshot[] => {
  const flag = getTemplateFlag(kind);

  return reviewTemplates
    .filter((template) => Boolean(template[flag]))
    .sort((a, b) => a.order - b.order)
    .map((template) => ({
      id: template.id,
      title: template.title,
      questions: template.questions,
      order: template.order,
      syncToTimeline: template.syncToTimeline
    }));
};

const getReviewTemplates = (
  kind: ReviewOverviewKind,
  review: ReviewRecord,
  reviewTemplates: ReviewTemplate[]
): ReviewTemplateSnapshot[] => {
  if (Array.isArray(review.templateSnapshot) && review.templateSnapshot.length > 0) {
    return [...review.templateSnapshot].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  return getCurrentTemplatesForKind(kind, reviewTemplates);
};

const buildTemplateLookup = (
  kind: ReviewOverviewKind,
  review: ReviewRecord,
  reviewTemplates: ReviewTemplate[]
): TemplateLookup => {
  const templates = getReviewTemplates(kind, review, reviewTemplates);
  const byQuestionId = new Map<string, QuestionDisplayMetadata>();
  const byQuestionText = new Map<string, QuestionDisplayMetadata>();

  templates.forEach((template, templateIndex) => {
    template.questions.forEach((question, questionIndex) => {
      const value = {
        groupTitle: template.title || UNGROUPED_TITLE,
        question: question.question,
        groupOrder: templateIndex,
        questionOrder: questionIndex,
        ...getQuestionDisplayMetadata(question)
      };

      byQuestionId.set(question.id, value);
      byQuestionText.set(normalizeTextKey(question.question), value);
    });
  });

  return {
    templates,
    byQuestionId,
    byQuestionText
  };
};

const getReviewPeriod = (
  kind: ReviewOverviewKind,
  review: ReviewRecord
): { label: string; start: string; end: string; sortDate: string } => {
  if (kind === 'weekly') {
    const weekly = review as WeeklyReview;
    return {
      label: `${weekly.weekStartDate} ~ ${weekly.weekEndDate}`,
      start: weekly.weekStartDate,
      end: weekly.weekEndDate,
      sortDate: weekly.weekEndDate || weekly.weekStartDate
    };
  }

  if (kind === 'monthly') {
    const monthly = review as MonthlyReview;
    return {
      label: `${monthly.monthStartDate.slice(0, 7)} (${monthly.monthStartDate} ~ ${monthly.monthEndDate})`,
      start: monthly.monthStartDate,
      end: monthly.monthEndDate,
      sortDate: monthly.monthEndDate || monthly.monthStartDate
    };
  }

  const daily = review as DailyReview;
  return {
    label: daily.date,
    start: daily.date,
    end: daily.date,
    sortDate: daily.date
  };
};

const compareOverviewAnswersNewestFirst = (
  a: ReviewOverviewAnswer,
  b: ReviewOverviewAnswer
): number => {
  const dateCompare = b.sortDate.localeCompare(a.sortDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return b.updatedAt - a.updatedAt;
};

const getQuestionDisplayMetadata = (question: ReviewQuestion): Pick<QuestionDisplayMetadata, 'type' | 'choices' | 'icon' | 'colorId'> => ({
  type: question.type || 'text',
  choices: question.choices,
  icon: question.icon,
  colorId: question.colorId
});

const compareOptionalAnswersNewestFirst = (
  a?: ReviewOverviewAnswer,
  b?: ReviewOverviewAnswer
): number => {
  if (a && b) {
    return compareOverviewAnswersNewestFirst(a, b);
  }

  if (a) {
    return -1;
  }

  if (b) {
    return 1;
  }

  return 0;
};

export const getReviewOverviewSections = ({
  dailyReviews,
  weeklyReviews,
  monthlyReviews,
  reviewTemplates
}: BuildReviewOverviewParams): ReviewOverviewSection[] => {
  const descriptors: ReviewDescriptor[] = [
    { kind: 'daily', title: 'Daily review', reviews: dailyReviews },
    { kind: 'weekly', title: 'Weekly review', reviews: weeklyReviews },
    { kind: 'monthly', title: 'Monthly review', reviews: monthlyReviews }
  ];

  return descriptors.map((descriptor) => {
    const groupMap = new Map<string, ReviewOverviewTemplateGroup>();
    const questionMap = new Map<string, ReviewOverviewQuestion>();

    descriptor.reviews.forEach((review) => {
      if (!Array.isArray(review.answers) || review.answers.length === 0) {
        return;
      }

      const lookup = buildTemplateLookup(descriptor.kind, review, reviewTemplates);
      const period = getReviewPeriod(descriptor.kind, review);

      review.answers.forEach((answer, answerIndex) => {
        const answerText = typeof answer.answer === 'string' ? answer.answer.trim() : '';
        if (!answerText) {
          return;
        }

        const matchedQuestion = lookup.byQuestionId.get(answer.questionId)
          || lookup.byQuestionText.get(normalizeTextKey(answer.question));
        const groupTitle = matchedQuestion?.groupTitle || UNGROUPED_TITLE;
        const questionText = (answer.question || matchedQuestion?.question || '').trim();

        if (!questionText) {
          return;
        }

        const groupKey = makeGroupKey(descriptor.kind, groupTitle);
        let group = groupMap.get(groupKey);

        if (!group) {
          group = {
            id: groupKey,
            title: groupTitle,
            order: matchedQuestion?.groupOrder ?? Number.POSITIVE_INFINITY,
            questions: [],
            answerCount: 0
          };
          groupMap.set(groupKey, group);
        }

        const questionKey = makeQuestionKey(descriptor.kind, groupTitle, questionText);
        let question = questionMap.get(questionKey);

        if (!question) {
          question = {
            id: questionKey,
            question: questionText,
            type: matchedQuestion?.type || 'text',
            choices: matchedQuestion?.choices,
            icon: matchedQuestion?.icon,
            colorId: matchedQuestion?.colorId,
            groupTitle,
            order: matchedQuestion?.questionOrder ?? Number.POSITIVE_INFINITY,
            answers: [],
            answerCount: 0
          };
          questionMap.set(questionKey, question);
          group.questions.push(question);
        }

        if (matchedQuestion) {
          group.order = Math.min(group.order, matchedQuestion.groupOrder);
          question.order = Math.min(question.order, matchedQuestion.questionOrder);
        }

        question.answers.push({
          id: makeAnswerId(descriptor.kind, review.id, answer, answerIndex),
          reviewId: review.id,
          kind: descriptor.kind,
          periodLabel: period.label,
          periodStart: period.start,
          periodEnd: period.end,
          sortDate: period.sortDate,
          answer: answerText,
          updatedAt: review.updatedAt || review.createdAt || 0
        });
      });
    });

    const groups = Array.from(groupMap.values())
      .map((group) => {
        const questions = group.questions
          .map((question) => {
            const answers = [...question.answers].sort(compareOverviewAnswersNewestFirst);

            return {
              ...question,
              answers,
              answerCount: answers.length,
              latestAnswer: answers[0]
            };
          })
          .filter((question) => question.answerCount > 0)
          .sort((a, b) => (
            compareOptionalAnswersNewestFirst(a.latestAnswer, b.latestAnswer)
            || a.order - b.order
            || a.question.localeCompare(b.question, 'zh-Hans-CN')
          ));
        const latestAnswer = questions.reduce<ReviewOverviewAnswer | undefined>((currentLatest, question) => {
          if (!question.latestAnswer) {
            return currentLatest;
          }

          if (!currentLatest || compareOverviewAnswersNewestFirst(question.latestAnswer, currentLatest) < 0) {
            return question.latestAnswer;
          }

          return currentLatest;
        }, undefined);

        return {
          ...group,
          questions,
          answerCount: questions.reduce((sum, question) => sum + question.answerCount, 0),
          latestAnswer
        };
      })
      .filter((group) => group.questions.length > 0)
      .sort((a, b) => {
        const latestCompare = compareOptionalAnswersNewestFirst(a.latestAnswer, b.latestAnswer);
        if (latestCompare !== 0) {
          return latestCompare;
        }
        if (a.title === UNGROUPED_TITLE) {
          return 1;
        }
        if (b.title === UNGROUPED_TITLE) {
          return -1;
        }
        return a.order - b.order || a.title.localeCompare(b.title, 'zh-Hans-CN');
      });

    return {
      kind: descriptor.kind,
      title: descriptor.title,
      groups,
      answerCount: groups.reduce((sum, group) => sum + group.answerCount, 0),
      questionCount: groups.reduce((sum, group) => sum + group.questions.length, 0)
    };
  });
};
