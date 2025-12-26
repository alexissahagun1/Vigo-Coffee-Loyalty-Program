import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  points_balance: number;
}

interface TopCustomersProps {
  customers: Customer[];
}

export function TopCustomers({ customers }: TopCustomersProps) {
  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-slate-400';
      case 2: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const maxPoints = customers[0]?.points_balance || 1;

  return (
    <div className="rounded-xl border border-border bg-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.35s' }}>
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="font-display text-xl font-semibold">Top Customers</h3>
      </div>
      
      <div className="space-y-4">
        {customers.slice(0, 5).map((customer, index) => (
          <div 
            key={customer.id} 
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              index === 0 && "bg-accent/50"
            )}
          >
            <div className={cn("text-lg font-bold w-6 text-center", getRankStyle(index))}>
              {index < 3 ? (
                <Medal className="w-5 h-5 mx-auto" />
              ) : (
                <span className="text-sm">{index + 1}</span>
              )}
            </div>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                {getInitials(customer.full_name, customer.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {customer.full_name || 'Anonymous'}
              </p>
              <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${(customer.points_balance / maxPoints) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-semibold text-foreground tabular-nums">
              {customer.points_balance}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
