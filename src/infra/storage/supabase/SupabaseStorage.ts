import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { SupabaseStorageAccount } from './SupabaseStorageAccount';

export class SupabaseStorage
  extends SupabaseStorageAccount
  implements MomentumStorage {}
