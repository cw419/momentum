/**
 * ImportExportModal - Entry point for data import/export functionality
 *
 * This module follows the Container/View pattern:
 * - ImportExportModalContainer: State management and business logic
 * - ImportExportModalView: Pure presentational component
 *
 * For backward compatibility, this file re-exports the Container as ImportExportModal.
 */

export { ImportExportModalContainer as ImportExportModal } from './ImportExportModalContainer';
