'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { KebabMenu } from '@/components/ui/KebabMenu';
import {
  banUserAction,
  unbanUserAction,
  setUserRoleAction,
  sendPasswordResetAction,
  deleteUserAction,
  type AdminUserActionState,
} from '@/app/[locale]/(admin)/admin/users/actions';

type AdminAction = (
  prev: AdminUserActionState | null,
  fd: FormData,
) => Promise<AdminUserActionState>;

interface Labels {
  promoteAdmin: string;
  demoteUser: string;
  ban7d: string;
  ban30d: string;
  banForever: string;
  unban: string;
  resetPassword: string;
  delete: string;
  confirmDelete: string;
  confirmBan: string;
}

interface Props {
  userId: string;
  email: string | null;
  role: 'Admin' | 'User';
  isBanned: boolean;
  isSelf: boolean;
  labels: Labels;
}

export function UserActionsMenu({ userId, email, role, isBanned, isSelf, labels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runAction(action: AdminAction, fd: FormData) {
    startTransition(async () => {
      await action(null, fd);
      router.refresh();
    });
  }

  function promote() {
    const fd = new FormData();
    fd.set('userId', userId);
    fd.set('role', 'Admin');
    runAction(setUserRoleAction, fd);
  }
  function demote() {
    const fd = new FormData();
    fd.set('userId', userId);
    fd.set('role', 'User');
    runAction(setUserRoleAction, fd);
  }
  function ban(duration: '7d' | '30d' | 'forever') {
    if (!confirm(labels.confirmBan)) return;
    const fd = new FormData();
    fd.set('userId', userId);
    fd.set('duration', duration);
    runAction(banUserAction, fd);
  }
  function unban() {
    const fd = new FormData();
    fd.set('userId', userId);
    runAction(unbanUserAction, fd);
  }
  function resetPassword() {
    if (!email) return;
    const fd = new FormData();
    fd.set('email', email);
    runAction(sendPasswordResetAction, fd);
  }
  function remove() {
    if (!confirm(labels.confirmDelete)) return;
    const fd = new FormData();
    fd.set('userId', userId);
    runAction(deleteUserAction, fd);
  }

  const items = [
    role === 'Admin'
      ? {
          id: 'demote',
          label: labels.demoteUser,
          disabled: pending || isSelf,
          onSelect: demote,
        }
      : {
          id: 'promote',
          label: labels.promoteAdmin,
          disabled: pending,
          onSelect: promote,
        },
    ...(email
      ? [
          {
            id: 'reset',
            label: labels.resetPassword,
            disabled: pending,
            onSelect: resetPassword,
          },
        ]
      : []),
    ...(isBanned
      ? [{ id: 'unban', label: labels.unban, disabled: pending, onSelect: unban }]
      : [
          {
            id: 'ban7d',
            label: labels.ban7d,
            disabled: pending || isSelf,
            onSelect: () => ban('7d'),
          },
          {
            id: 'ban30d',
            label: labels.ban30d,
            disabled: pending || isSelf,
            onSelect: () => ban('30d'),
          },
          {
            id: 'banForever',
            label: labels.banForever,
            disabled: pending || isSelf,
            onSelect: () => ban('forever'),
          },
        ]),
    {
      id: 'delete',
      label: labels.delete,
      destructive: true,
      disabled: pending || isSelf,
      onSelect: remove,
    },
  ];

  return <KebabMenu label="User actions" items={items} />;
}
