import { t } from '../index';
import { authProcedure } from '../auth-procedure';
import { superAdminService } from '@/lib/firebase/services/super-admin.service';

export const adminRouter = t.router({
  getPlatformStats: authProcedure.query(async () => {
    return await superAdminService.getPlatformStats();
  }),
});
