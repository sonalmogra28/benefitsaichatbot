'use client';

import type { AuthUser } from '@/app/(auth)/stack-auth';
import { useRouter } from 'next/navigation';

import { PlusIcon, DollarSign, LayoutGrid } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: AuthUser | null | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const isCompanyAdmin = user?.type === 'company_admin';

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Benefits AI Assistant
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {isCompanyAdmin && (
          <div className="px-2 mb-4 space-y-2">
            <Link href="/company-admin/benefits" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
              <DollarSign className="size-5" />
              <span>Cost Calculator</span>
            </Link>
            <Link href="/company-admin/benefits/compare" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
              <LayoutGrid className="size-5" />
              <span>Compare Plans</span>
            </Link>
          </div>
        )}
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
