import { t } from '../index';
import { authProcedure } from '../auth-procedure';
import { getContainer } from '@/lib/azure/cosmos-db';
import { superAdminService } from '@/lib/services/super-admin.service';

export const adminRouter = t.router({
  getPlatformStats: authProcedure.query(async () => {
    return await superAdminService.getPlatformStats();
  }),
});
