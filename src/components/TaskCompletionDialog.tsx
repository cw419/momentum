import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, FileText, MessageSquare, History, RotateCcw } from 'lucide-react';
import { useStorage } from '../storage/useStorage';
import { useI18n } from '../i18n';
import { logger } from '../utils/logger';
import { toError } from '../utils/errorMessage';

interface TaskCompletionDialogProps {
  isOpen: boolean;
  chainName: string;
  chainId: string;
  isDurationless?: boolean;
  onComplete: (description: string, notes?: string) => void;
  onCancel: () => void;
}

export const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  isOpen,
  chainName,
  chainId,
  isDurationless = false,
  onComplete,
  onCancel,
}) => {
  const { tr } = useI18n();
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [recentDescriptions, setRecentDescriptions] = useState<string[]>([]);
  const [showQuickFill, setShowQuickFill] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const storage = useStorage();

  // 加载该链条的最近任务描述
  useEffect(() => {
    if (isOpen && chainId) {
      const loadRecentDescriptions = async () => {
        try {
          const history = await storage.getCompletionHistory();
          const chainHistory = history
            .filter(h => h.chainId === chainId && h.wasSuccessful && h.description)
            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
            .slice(0, 5); // 最近5次成功的描述
          
          const descriptions = chainHistory.map(h => h.description!).filter(Boolean);
          const uniqueDescriptions = Array.from(new Set(descriptions));
          setRecentDescriptions(uniqueDescriptions);
        } catch (error) {
          logger.error('TASK_COMPLETION', 'Failed to load recent descriptions', { chainId }, toError(error));
        }
      };
      
      loadRecentDescriptions();
    }
  }, [isOpen, chainId, storage]);

  // Auto-focus description input when dialog opens
  useEffect(() => {
    if (isOpen && descriptionInputRef.current) {
      setTimeout(() => {
        descriptionInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Tab key behavior
  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: 显示/隐藏快速填充
        setShowQuickFill(!showQuickFill);
      } else {
        // Tab: 切换到备注或填充描述
        if (description.trim()) {
          setIsNotesVisible(true);
          setTimeout(() => {
            notesTextareaRef.current?.focus();
          }, 100);
        } else if (recentDescriptions.length > 0) {
          // 如果没有输入描述但有历史记录，填充最近的描述
          const mostRecent = recentDescriptions[0];
          setDescription(mostRecent);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleQuickFill = (desc: string) => {
    setDescription(desc);
    setShowQuickFill(false);
    descriptionInputRef.current?.focus();
  };

  // Basic input sanitization to prevent XSS
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  };

  const handleSubmit = () => {
    if (isDurationless && !description.trim()) {
      // For infinite duration tasks, description is required
      return;
    }
    // Sanitize inputs before submitting
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedNotes = notes.trim() ? sanitizeInput(notes) : undefined;
    
    // For finite duration tasks, description is optional
    onComplete(sanitizedDescription || '', sanitizedNotes);
    // Reset form
    setDescription('');
    setNotes('');
    setIsNotesVisible(false);
    setShowQuickFill(false);
  };

  const handleCancel = () => {
    setDescription('');
    setNotes('');
    setIsNotesVisible(false);
    setShowQuickFill(false);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-completion-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <h2 id="task-completion-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">
                {tr('完成任务', 'Complete task')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {chainName}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleCancel}
            aria-label={tr('关闭', 'Close')}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Task Description */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="text-gray-500 dark:text-gray-400" size={16} />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tr('任务描述', 'Task description')}
                  {isDurationless ? ' *' : tr('（可选）', ' (optional)')}
                </label>
              </div>
              
              {/* Quick Fill Button */}
              {recentDescriptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowQuickFill(!showQuickFill)}
                  aria-label={tr('显示历史描述', 'Show history')}
                  aria-expanded={showQuickFill}
                  className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <History size={14} />
                  <span>{tr('历史', 'History')}</span>
                </button>
              )}
            </div>
            
            <input
              ref={descriptionInputRef}
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              placeholder={
                isDurationless
                  ? tr('例如：完成 CS61A 的第一部分（按 Tab 添加备注或自动填充）', 'e.g. Finish CS61A Part 1 (Tab to add notes or auto-fill)')
                  : tr('例如：完成 CS61A 的第一部分（可选，按 Tab 添加备注）', 'e.g. Finish CS61A Part 1 (optional, Tab to add notes)')
              }
              aria-label={tr('任务描述', 'Task description')}
              aria-required={isDurationless}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              required={isDurationless}
            />
            
            {/* Quick Fill Panel */}
            {showQuickFill && recentDescriptions.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl animate-slide-down">
                <div className="flex items-center space-x-2 mb-2">
                  <RotateCcw className="text-blue-600 dark:text-blue-400" size={14} />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {tr('最近的任务描述', 'Recent descriptions')}
                  </span>
                </div>
                <div className="space-y-1">
                  {recentDescriptions.map((desc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickFill(desc)}
                      className="w-full text-left px-3 py-2 text-sm text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors truncate"
                      title={desc}
                    >
                      {desc}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isDurationless 
                ? tr(
                    '按 Tab 添加备注或自动填充，按 Shift+Tab 显示历史，按 Enter 完成',
                    'Tab to add notes or auto-fill, Shift+Tab for history, Enter to complete'
                  )
                : tr('任务描述可选，按 Tab 添加备注，按 Enter 完成', 'Description optional; Tab to add notes; Enter to complete')}
            </p>
          </div>

          {/* Notes Section */}
          {isNotesVisible && (
            <div className="animate-slide-down">
              <div className="flex items-center space-x-2 mb-3">
                <MessageSquare className="text-gray-500 dark:text-gray-400" size={16} />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tr('备注（可选）', 'Notes (optional)')}
                </label>
              </div>
              <textarea
                ref={notesTextareaRef}
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={handleNotesKeyDown}
                placeholder={tr('添加更多详细信息或感想…', 'Add more details or thoughts…')}
                rows={3}
                aria-label={tr('备注', 'Notes')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tr('按 Ctrl+Enter 完成，按 Esc 取消', 'Ctrl+Enter to complete, Esc to cancel')}
              </p>
            </div>
          )}

          {!isNotesVisible && (
            <button
              type="button"
              onClick={() => {
                setIsNotesVisible(true);
                setTimeout(() => {
                  notesTextareaRef.current?.focus();
                }, 100);
              }}
              aria-label={tr('添加备注', 'Add notes')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {tr('+ 添加备注', '+ Add notes')}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              aria-label={tr('取消', 'Cancel')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              {tr('取消', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isDurationless && !description.trim()}
              aria-label={tr('完成任务', 'Complete task')}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {tr('完成任务', 'Complete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
