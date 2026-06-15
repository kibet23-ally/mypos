import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users } from 'lucide-react';

interface UserRow { id: number; username: string; role: 'superadmin' | 'owner' | 'cashier'; tenant: string; status: 'active' | 'inactive'; lastLogin: string; }

const USERS: UserRow[] = [
  { id: 1, username: 'superadmin_pos', role: 'superadmin', tenant: 'PosifyPro HQ', status: 'active', lastLogin: 'Jun 8, 2026' },
  { id: 2, username: 'owner_demo',     role: 'owner',      tenant: 'Demo Business Inc.', status: 'active', lastLogin: 'Jun 8, 2026' },
  { id: 3, username: 'cashier_demo',   role: 'cashier',    tenant: 'Demo Business Inc.', status: 'active', lastLogin: 'Jun 7, 2026' },
  { id: 4, username: 'owner_citym',    role: 'owner',      tenant: 'City Mart', status: 'active', lastLogin: 'Jun 7, 2026' },
  { id: 5, username: 'cashier_cm1',    role: 'cashier',    tenant: 'City Mart', status: 'inactive', lastLogin: 'Jun 5, 2026' },
  { id: 6, username: 'cashier_cm2',    role: 'cashier',    tenant: 'City Mart', status: 'active', lastLogin: 'Jun 8, 2026' },
];

const ROLE_COUNTS = [
  { role: 'SuperAdmin', count: 3 },
  { role: 'Owner', count: 52 },
  { role: 'Cashier', count: 138 },
];

const PIE_COLORS = ['hsl(var(--chart-3))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

const ROLE_CFG = {
  superadmin: 'bg-[hsl(221_83%_93%)] text-[hsl(221_83%_35%)]',
  owner: 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]',
  cashier: 'bg-[hsl(38_92%_90%)] text-[hsl(38_92%_30%)]',
};

export default function SAUsersRoles() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">Users & Roles</h2>
        <p className="text-sm text-muted-foreground mt-1">All user accounts and their role assignments</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ROLE_COUNTS} barSize={48}>
                  <XAxis dataKey="role" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Users']} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Users">
                    {ROLE_COUNTS.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={ROLE_COUNTS} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="role"
                    label={({ role, percent }: { role: string; percent: number }) => `${role} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {ROLE_COUNTS.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Users']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-balance">
            <Users className="w-4 h-4" /> User Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Username', 'Role', 'Tenant', 'Status', 'Last Login'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USERS.map((u, i) => (
                  <tr key={u.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-6 py-3 text-sm font-medium text-foreground font-mono">{u.username}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={`text-xs ${ROLE_CFG[u.role]}`}>{u.role}</Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{u.tenant}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={u.status === 'active' ? 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)] text-xs' : 'bg-secondary text-secondary-foreground text-xs'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{u.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
