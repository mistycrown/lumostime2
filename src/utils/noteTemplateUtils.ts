/**
 * @file noteTemplateUtils.ts
 * @input Categories, scopes, todos, and current note content
 * @output Recommended note template lists and note insertion helpers
 * @pos Utility
 * @description Centralizes note-template sorting, context-aware recommendation ordering, and append-to-note behavior so add-log and focus flows stay aligned.
 * @updated 2026-04-19: Added shared note template recommendation and insertion helpers.
 */
import { Category, NoteTemplate, Scope, TodoItem } from '../types';

export type NoteTemplateEntityType = 'activity' | 'category' | 'scope';

export type RecommendedNoteTemplateOrigin =
  | 'selectedActivity'
  | 'selectedCategory'
  | 'selectedScope'
  | 'todoActivity'
  | 'todoCategory'
  | 'todoScope';

export interface RecommendedNoteTemplate extends NoteTemplate {
  key: string;
  entityType: NoteTemplateEntityType;
  entityId: string;
  entityName: string;
  origin: RecommendedNoteTemplateOrigin;
  sourceLabel: string;
}

interface GetRecommendedNoteTemplatesOptions {
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  selectedCategoryId?: string;
  selectedActivityId?: string;
  selectedScopeIds?: string[];
  linkedTodoId?: string;
}

export const sortNoteTemplates = (templates?: NoteTemplate[]): NoteTemplate[] => {
  if (!templates || templates.length === 0) {
    return [];
  }

  return templates
    .map((template, index) => ({ template, index }))
    .sort((left, right) => {
      const leftOrder = typeof left.template.order === 'number' ? left.template.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right.template.order === 'number' ? right.template.order : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ template }) => template);
};

export const appendTemplateToNote = (note: string, templateContent: string): string => {
  const normalizedTemplate = templateContent.trim();
  if (!normalizedTemplate) {
    return note;
  }

  if (!note.trim()) {
    return normalizedTemplate;
  }

  return `${note}${note.endsWith('\n') ? '' : '\n'}${normalizedTemplate}`;
};

export const getRecommendedNoteTemplates = ({
  categories,
  scopes,
  todos,
  selectedCategoryId,
  selectedActivityId,
  selectedScopeIds,
  linkedTodoId
}: GetRecommendedNoteTemplatesOptions): RecommendedNoteTemplate[] => {
  const results: RecommendedNoteTemplate[] = [];
  const seen = new Set<string>();

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId)
    ?? categories.find((category) => category.activities.some((activity) => activity.id === selectedActivityId));
  const selectedActivity = selectedCategory?.activities.find((activity) => activity.id === selectedActivityId)
    ?? categories.flatMap((category) => category.activities).find((activity) => activity.id === selectedActivityId);
  const linkedTodo = todos.find((todo) => todo.id === linkedTodoId);

  const pushTemplates = (
    entityType: NoteTemplateEntityType,
    entityId: string,
    entityName: string,
    templates: NoteTemplate[] | undefined,
    origin: RecommendedNoteTemplateOrigin,
    sourceLabel: string
  ) => {
    sortNoteTemplates(templates).forEach((template) => {
      const key = `${entityType}:${entityId}:${template.id}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      results.push({
        ...template,
        key,
        entityType,
        entityId,
        entityName,
        origin,
        sourceLabel
      });
    });
  };

  if (selectedActivity) {
    pushTemplates(
      'activity',
      selectedActivity.id,
      selectedActivity.name,
      selectedActivity.noteTemplates,
      'selectedActivity',
      '当前标签'
    );
  }

  if (selectedCategory) {
    pushTemplates(
      'category',
      selectedCategory.id,
      selectedCategory.name,
      selectedCategory.noteTemplates,
      'selectedCategory',
      '当前分类'
    );
  }

  (selectedScopeIds || []).forEach((scopeId) => {
    const scope = scopes.find((item) => item.id === scopeId);
    if (!scope) {
      return;
    }

    pushTemplates(
      'scope',
      scope.id,
      scope.name,
      scope.noteTemplates,
      'selectedScope',
      '当前领域'
    );
  });

  if (!linkedTodo) {
    return results;
  }

  const todoLinkedCategory = linkedTodo.linkedCategoryId
    ? categories.find((category) => category.id === linkedTodo.linkedCategoryId)
    : undefined;

  if (linkedTodo.linkedActivityId) {
    const todoActivityCategory = categories.find((category) =>
      category.activities.some((activity) => activity.id === linkedTodo.linkedActivityId)
    );
    const todoActivity = todoActivityCategory?.activities.find((activity) => activity.id === linkedTodo.linkedActivityId);

    if (todoActivity) {
      pushTemplates(
        'activity',
        todoActivity.id,
        todoActivity.name,
        todoActivity.noteTemplates,
        'todoActivity',
        '待办标签'
      );
    }

    const todoCategory = todoLinkedCategory ?? todoActivityCategory;

    if (todoCategory) {
      pushTemplates(
        'category',
        todoCategory.id,
        todoCategory.name,
        todoCategory.noteTemplates,
        'todoCategory',
        '待办分类'
      );
    }
  } else if (todoLinkedCategory) {
    pushTemplates(
      'category',
      todoLinkedCategory.id,
      todoLinkedCategory.name,
      todoLinkedCategory.noteTemplates,
      'todoCategory',
      '待办分类'
    );
  }

  (linkedTodo.defaultScopeIds || []).forEach((scopeId) => {
    const scope = scopes.find((item) => item.id === scopeId);
    if (!scope) {
      return;
    }

    pushTemplates(
      'scope',
      scope.id,
      scope.name,
      scope.noteTemplates,
      'todoScope',
      '待办领域'
    );
  });

  return results;
};
