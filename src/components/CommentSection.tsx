/**
 * @file CommentSection.tsx
 * @input comments, onAddComment, onEditComment, onDeleteComment
 * @output Comment CRUD Operations
 * @pos Component (Content Display)
 * @description 专注记录评论区组件 - 支持添加、编辑和显示评论
 * 
 * 核心功能：
 * - 添加新评论
 * - 编辑现有评论
 * - 删除评论
 * - 显示评论列表和时间戳
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useReducer } from 'react';
import { Comment } from '../types';
import { Plus, Edit3, Trash2 } from 'lucide-react';

interface CommentSectionProps {
  comments?: Comment[];
  onAddComment: (content: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

// State management with useReducer
type CommentState = {
  mode: 'idle' | 'adding' | 'editing';
  content: string;
  editingId: string | null;
};

type CommentAction =
  | { type: 'START_ADDING' }
  | { type: 'START_EDITING'; id: string; content: string }
  | { type: 'UPDATE_CONTENT'; content: string }
  | { type: 'CANCEL' }
  | { type: 'SUBMIT' };

const commentReducer = (state: CommentState, action: CommentAction): CommentState => {
  switch (action.type) {
    case 'START_ADDING':
      return { mode: 'adding', content: '', editingId: null };
    case 'START_EDITING':
      return { mode: 'editing', content: action.content, editingId: action.id };
    case 'UPDATE_CONTENT':
      return { ...state, content: action.content };
    case 'CANCEL':
    case 'SUBMIT':
      return { mode: 'idle', content: '', editingId: null };
    default:
      return state;
  }
};

export const CommentSection: React.FC<CommentSectionProps> = ({ 
  comments = [], 
  onAddComment,
  onEditComment,
  onDeleteComment
}) => {
  const [state, dispatch] = useReducer(commentReducer, {
    mode: 'idle',
    content: '',
    editingId: null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.content.trim()) {
      if (state.mode === 'adding') {
        onAddComment(state.content.trim());
      } else if (state.mode === 'editing' && state.editingId && onEditComment) {
        onEditComment(state.editingId, state.content.trim());
      }
      dispatch({ type: 'SUBMIT' });
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Comments</span>
        {state.mode === 'idle' && (
          <button
            onClick={() => dispatch({ type: 'START_ADDING' })}
            className="text-stone-500 hover:text-stone-800 transition-colors"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
      
      {/* Comments List */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-stone-200 pl-3">
              {state.mode === 'editing' && state.editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={state.content}
                    onChange={(e) => dispatch({ type: 'UPDATE_CONTENT', content: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-stone-800 leading-relaxed font-serif focus:outline-none focus:ring-1 focus:border-stone-200 transition-all resize-none"
                    style={{
                      '--tw-ring-color': 'var(--accent-color)'
                    } as React.CSSProperties}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmit}
                      className="btn-template-filled px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'CANCEL' })}
                      className="btn-template-outline px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* 编辑按钮 - 右上角 */}
                  {onEditComment && (
                    <button
                      onClick={() => dispatch({ type: 'START_EDITING', id: comment.id, content: comment.content })}
                      className="absolute top-0 right-0 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                  
                  {/* 评论内容 */}
                  <p className="text-sm text-stone-800 leading-relaxed font-serif mb-1 pr-8">
                    {comment.content}
                  </p>
                  
                  {/* 时间和删除按钮 */}
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-stone-400 font-mono">
                      {formatTime(comment.createdAt)}
                    </span>
                    {/* 删除按钮 - 右下角 */}
                    {onDeleteComment && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Comment Form */}
      {(state.mode === 'adding' || state.mode === 'editing') && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={state.content}
            onChange={(e) => dispatch({ type: 'UPDATE_CONTENT', content: e.target.value })}
            placeholder="Add a comment..."
            className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-stone-800 text-sm min-h-[80px] shadow-sm focus:outline-none focus:ring-1 focus:border-stone-200 transition-all resize-none placeholder:text-stone-300 font-serif"
            style={{
              '--tw-ring-color': 'var(--accent-color)'
            } as React.CSSProperties}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => dispatch({ type: 'CANCEL' })}
              className="btn-template-outline px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!state.content.trim()}
              className="btn-template-filled px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.mode === 'adding' ? 'Add Comment' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};