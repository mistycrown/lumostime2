import { describe, expect, it } from 'vitest';
import type { DailyReview, ReviewTemplate, WeeklyReview } from '../types';
import { getReviewOverviewSections } from './reviewOverviewUtils';

const createDailyReview = (review: Partial<DailyReview>): DailyReview => ({
  id: review.id || 'daily-1',
  date: review.date || '2026-08-01',
  createdAt: review.createdAt ?? 1,
  updatedAt: review.updatedAt ?? 1,
  answers: review.answers || [],
  templateSnapshot: review.templateSnapshot
});

const createWeeklyReview = (review: Partial<WeeklyReview>): WeeklyReview => ({
  id: review.id || 'weekly-1',
  weekStartDate: review.weekStartDate || '2026-08-03',
  weekEndDate: review.weekEndDate || '2026-08-09',
  createdAt: review.createdAt ?? 1,
  updatedAt: review.updatedAt ?? 1,
  answers: review.answers || [],
  templateSnapshot: review.templateSnapshot
});

const templates: ReviewTemplate[] = [
  {
    id: 'daily-template',
    title: '能量',
    questions: [
      { id: 'energy-q', question: '今天的精力在哪里？', type: 'text' }
    ],
    isSystem: false,
    order: 0,
    isDailyTemplate: true,
    syncToTimeline: false
  },
  {
    id: 'weekly-template',
    title: '推进',
    questions: [
      { id: 'weekly-q', question: '这周最重要的推进是什么？', type: 'text' }
    ],
    isSystem: false,
    order: 1,
    isDailyTemplate: false,
    isWeeklyTemplate: true,
    syncToTimeline: false
  }
];

describe('reviewOverviewUtils', () => {
  it('groups answers by historical template snapshots first', () => {
    const sections = getReviewOverviewSections({
      dailyReviews: [
        createDailyReview({
          answers: [
            { questionId: 'old-q', question: '旧问题', answer: '保留在旧分组里' }
          ],
          templateSnapshot: [
            {
              id: 'old-template',
              title: '旧分组',
              questions: [
                { id: 'old-q', question: '旧问题', type: 'text' }
              ]
            }
          ]
        })
      ],
      weeklyReviews: [],
      monthlyReviews: [],
      reviewTemplates: templates
    });

    expect(sections[0].groups[0].title).toBe('旧分组');
    expect(sections[0].groups[0].questions[0].question).toBe('旧问题');
    expect(sections[0].groups[0].questions[0].answers[0].answer).toBe('保留在旧分组里');
  });

  it('falls back to current templates for older records without snapshots', () => {
    const sections = getReviewOverviewSections({
      dailyReviews: [
        createDailyReview({
          answers: [
            { questionId: 'energy-q', question: '今天的精力在哪里？', answer: '主要在写作。' }
          ],
          templateSnapshot: undefined
        })
      ],
      weeklyReviews: [],
      monthlyReviews: [],
      reviewTemplates: templates
    });

    expect(sections[0].groups[0].title).toBe('能量');
    expect(sections[0].groups[0].answerCount).toBe(1);
  });

  it('keeps unmatched answers under an ungrouped section', () => {
    const sections = getReviewOverviewSections({
      dailyReviews: [
        createDailyReview({
          answers: [
            { questionId: 'missing-q', question: '没有模板的问题', answer: '仍然应该被找到。' }
          ]
        })
      ],
      weeklyReviews: [],
      monthlyReviews: [],
      reviewTemplates: templates
    });

    expect(sections[0].groups[0].title).toBe('未分组');
    expect(sections[0].groups[0].questions[0].answerCount).toBe(1);
  });

  it('sorts question detail answers newest first', () => {
    const sections = getReviewOverviewSections({
      dailyReviews: [
        createDailyReview({
          id: 'daily-old',
          date: '2026-08-01',
          answers: [
            { questionId: 'energy-q', question: '今天的精力在哪里？', answer: '旧回答' }
          ]
        }),
        createDailyReview({
          id: 'daily-new',
          date: '2026-08-09',
          answers: [
            { questionId: 'energy-q', question: '今天的精力在哪里？', answer: '新回答' }
          ]
        })
      ],
      weeklyReviews: [
        createWeeklyReview({
          id: 'weekly-newer',
          weekStartDate: '2026-08-10',
          weekEndDate: '2026-08-16',
          answers: [
            { questionId: 'weekly-q', question: '这周最重要的推进是什么？', answer: '后一个周回答' }
          ]
        })
      ],
      monthlyReviews: [],
      reviewTemplates: templates
    });

    expect(sections[0].groups[0].questions[0].answers.map((answer) => answer.answer)).toEqual([
      '新回答',
      '旧回答'
    ]);
    expect(sections[1].groups[0].questions[0].latestAnswer?.periodLabel).toBe('2026-08-10 ~ 2026-08-16');
  });

  it('sorts groups and questions by newest answer first', () => {
    const sortingTemplates: ReviewTemplate[] = [
      {
        id: 'early-template',
        title: '旧顺序分组',
        questions: [
          { id: 'old-question', question: '旧问题', type: 'text' },
          { id: 'newer-question', question: '较新的问题', type: 'text' }
        ],
        isSystem: false,
        order: 0,
        isDailyTemplate: true,
        syncToTimeline: false
      },
      {
        id: 'late-template',
        title: '最新分组',
        questions: [
          { id: 'newest-group-question', question: '最新分组的问题', type: 'text' }
        ],
        isSystem: false,
        order: 1,
        isDailyTemplate: true,
        syncToTimeline: false
      }
    ];

    const sections = getReviewOverviewSections({
      dailyReviews: [
        createDailyReview({
          id: 'daily-older',
          date: '2026-08-01',
          answers: [
            { questionId: 'old-question', question: '旧问题', answer: '旧问题回答' }
          ]
        }),
        createDailyReview({
          id: 'daily-newer',
          date: '2026-08-08',
          answers: [
            { questionId: 'newer-question', question: '较新的问题', answer: '较新问题回答' }
          ]
        }),
        createDailyReview({
          id: 'daily-newest',
          date: '2026-08-09',
          answers: [
            { questionId: 'newest-group-question', question: '最新分组的问题', answer: '最新分组回答' }
          ]
        })
      ],
      weeklyReviews: [],
      monthlyReviews: [],
      reviewTemplates: sortingTemplates
    });

    expect(sections[0].groups.map((group) => group.title)).toEqual(['最新分组', '旧顺序分组']);
    expect(sections[0].groups[1].questions.map((question) => question.question)).toEqual(['较新的问题', '旧问题']);
  });

  it('preserves choice and rating display metadata', () => {
    const typedTemplates: ReviewTemplate[] = [
      {
        id: 'typed-template',
        title: '状态',
        questions: [
          { id: 'choice-question', question: '今天的状态？', type: 'choice', choices: ['轻盈', '普通'] },
          { id: 'rating-question', question: '今天打几分？', type: 'rating', icon: 'Heart', colorId: 'rose' }
        ],
        isSystem: false,
        order: 0,
        isDailyTemplate: true,
        syncToTimeline: false
      }
    ];

    const sections = getReviewOverviewSections({
      dailyReviews: [
        createDailyReview({
          answers: [
            { questionId: 'choice-question', question: '今天的状态？', answer: '轻盈' },
            { questionId: 'rating-question', question: '今天打几分？', answer: '4' }
          ]
        })
      ],
      weeklyReviews: [],
      monthlyReviews: [],
      reviewTemplates: typedTemplates
    });

    expect(sections[0].groups[0].questions[0]).toMatchObject({
      type: 'choice',
      choices: ['轻盈', '普通']
    });
    expect(sections[0].groups[0].questions[1]).toMatchObject({
      type: 'rating',
      icon: 'Heart',
      colorId: 'rose'
    });
  });
});
