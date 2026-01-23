/**
 * @file CommentSection.tsx
 * @description 专注记录评论区组件，支持添加和显示评论
 */
import React, { useState } from 'react';
import { Comment } from '../types';
import { Plus, Edit3, Trash2 } from 'lucide-react';

interface CommentSectionProps {
  comments?: Comment[];
  onAddComment: (content: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ 
  comments = [], 
  onAddComment,
  onEditComment,
  onDeleteComment
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
      setIsAdding(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim() && onEditComment) {
      onEditComment(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (commentId: string) => {
    if (onDeleteComment) {
      onDeleteComment(commentId);
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
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
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
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-stone-800 leading-relaxed font-serif focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-stone-200 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-300 transition-colors"
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
                      onClick={() => handleEdit(comment)}
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
                        onClick={() => handleDelete(comment.id)}
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

      {/* Add Comment Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-stone-800 text-sm min-h-[80px] shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all resize-none placeholder:text-stone-300 font-serif"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewComment('');
              }}
              className="px-4 py-2 bg-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Comment
            </button>
          </div>
        </form>
      )}
    </div>
  );
};