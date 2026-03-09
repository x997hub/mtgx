import { Users, Vote, BarChart3, ScrollText, TrendingUp, TrendingDown } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { BarChartCard } from "@/components/ui/charts/BarChartCard";
import { AreaChartCard } from "@/components/ui/charts/AreaChartCard";
import { DonutChartCard } from "@/components/ui/charts/DonutChartCard";
import { LineChartCard } from "@/components/ui/charts/LineChartCard";

// ── Mock data ──

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const eventsPerMonth = MONTHS.map((month, i) => ({
  month,
  events: [45, 38, 52, 61, 55, 48, 42, 39, 58, 67, 53, 49][i],
}));

const attendanceTrend = MONTHS.map((month, i) => ({
  month,
  attendance: [62, 65, 68, 71, 69, 74, 72, 70, 76, 73, 78, 75][i],
}));

const formatDistribution = [
  { name: "Commander", value: 45, color: "#8b4513" },
  { name: "Pauper", value: 30, color: "#6b8e23" },
  { name: "Standard", value: 25, color: "#4169e1" },
  { name: "Draft", value: 20, color: "#9932cc" },
];

const rsvpTrend = MONTHS.map((month, i) => ({
  month,
  going: [120, 115, 135, 142, 138, 150, 145, 140, 160, 155, 165, 158][i],
  maybe: [35, 40, 38, 42, 45, 40, 48, 50, 42, 38, 44, 40][i],
}));

type PlayerRow = {
  name: string;
  city: string;
  format: string;
  eventsPlayed: number;
  winRate: number;
  attendance: number;
  status: "active" | "inactive" | "new";
};

const players: PlayerRow[] = [
  { name: "Amir Cohen", city: "Tel Aviv", format: "Commander", eventsPlayed: 87, winRate: 62, attendance: 94, status: "active" },
  { name: "Yael Levy", city: "Rishon LeZion", format: "Pauper", eventsPlayed: 65, winRate: 58, attendance: 88, status: "active" },
  { name: "Oded Katz", city: "Herzliya", format: "Standard", eventsPlayed: 43, winRate: 71, attendance: 76, status: "active" },
  { name: "Noa Shapira", city: "Ramat Gan", format: "Draft", eventsPlayed: 92, winRate: 55, attendance: 97, status: "active" },
  { name: "Eitan Berg", city: "Tel Aviv", format: "Commander", eventsPlayed: 31, winRate: 48, attendance: 65, status: "inactive" },
  { name: "Maya Rosen", city: "Kfar Saba", format: "Pauper", eventsPlayed: 78, winRate: 64, attendance: 91, status: "active" },
  { name: "Dani Goldberg", city: "Tel Aviv", format: "Standard", eventsPlayed: 56, winRate: 59, attendance: 82, status: "active" },
  { name: "Tali Friedman", city: "Rishon LeZion", format: "Commander", eventsPlayed: 12, winRate: 42, attendance: 100, status: "new" },
  { name: "Uri Avraham", city: "Herzliya", format: "Draft", eventsPlayed: 45, winRate: 67, attendance: 78, status: "active" },
  { name: "Shira Weiss", city: "Ramat Gan", format: "Pauper", eventsPlayed: 89, winRate: 61, attendance: 95, status: "active" },
  { name: "Ron Mizrahi", city: "Tel Aviv", format: "Commander", eventsPlayed: 23, winRate: 52, attendance: 71, status: "inactive" },
  { name: "Lior Peretz", city: "Kfar Saba", format: "Standard", eventsPlayed: 67, winRate: 73, attendance: 86, status: "active" },
  { name: "Gal Ben-David", city: "Rishon LeZion", format: "Draft", eventsPlayed: 8, winRate: 38, attendance: 100, status: "new" },
  { name: "Hila Stern", city: "Tel Aviv", format: "Pauper", eventsPlayed: 54, winRate: 56, attendance: 80, status: "active" },
  { name: "Avi Schwartz", city: "Herzliya", format: "Commander", eventsPlayed: 71, winRate: 69, attendance: 92, status: "active" },
];

const STATUS_MAP: Record<string, "success" | "danger" | "warning"> = {
  active: "success",
  inactive: "danger",
  new: "warning",
};

const columns: ColumnDef<PlayerRow>[] = [
  { accessorKey: "name", header: "Player" },
  { accessorKey: "city", header: "City" },
  { accessorKey: "format", header: "Format" },
  {
    accessorKey: "eventsPlayed",
    header: "Events",
    cell: ({ getValue }) => <span className="font-mono">{getValue<number>()}</span>,
  },
  {
    accessorKey: "winRate",
    header: "Win %",
    cell: ({ getValue }) => <span className="font-mono">{getValue<number>()}%</span>,
  },
  {
    accessorKey: "attendance",
    header: "Attendance",
    cell: ({ getValue }) => {
      const val = getValue<number>();
      return <span className={`font-mono ${val >= 90 ? "text-success" : val >= 75 ? "text-warning" : "text-danger"}`}>{val}%</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<string>();
      return <Badge variant={STATUS_MAP[status] ?? "neutral"}>{status}</Badge>;
    },
  },
];

export default function DesignSystemPage() {
  return (
    <div className="space-y-8 p-4 md:p-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Design System</h1>
        <p className="text-text-secondary mt-1">MTGX component library — light & dark themes</p>
      </div>

      {/* Stat Cards */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Stat Cards</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Players"
            value={120}
            icon={Users}
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Events Held"
            value="1,967"
            icon={Vote}
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            title="Avg Attendance"
            value="68%"
            icon={BarChart3}
            trend={{ value: 3, positive: false }}
          />
          <StatCard
            title="Active Formats"
            value={4}
            icon={ScrollText}
          />
        </div>
      </section>

      {/* Data Table */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Players Directory</h2>
        <DataTable data={players} columns={columns} pageSize={10} />
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard
            title="Events per Month"
            data={eventsPerMonth}
            dataKey="events"
            categoryKey="month"
          />
          <AreaChartCard
            title="Attendance Trend"
            data={attendanceTrend}
            dataKey="attendance"
            categoryKey="month"
            color="#22c55e"
          />
          <DonutChartCard
            title="Format Distribution"
            data={formatDistribution}
          />
          <LineChartCard
            title="RSVP Trends"
            data={rsvpTrend}
            categoryKey="month"
            lines={[
              { dataKey: "going", color: "#22c55e", name: "Going" },
              { dataKey: "maybe", color: "#eab308", name: "Maybe" },
            ]}
          />
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Badge Variants</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="soft">Soft</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </section>
    </div>
  );
}
