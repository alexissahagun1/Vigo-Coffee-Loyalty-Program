'use client';

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Shield, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeEditDialog } from "./EmployeeEditDialog";

interface Employee {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  onEdit?: (employee: Employee) => void;
  onToggleActive?: (employee: Employee) => void;
  onEmployeeUpdated?: () => void;
}

export function EmployeeTable({ employees, onEdit, onToggleActive, onEmployeeUpdated }: EmployeeTableProps) {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getInitials = (name: string | null, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    onEmployeeUpdated?.();
  };

  return (
    <>
      <EmployeeEditDialog
        employee={editingEmployee}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Employee</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Username</TableHead>
            <TableHead className="text-muted-foreground font-medium">Role</TableHead>
            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Joined</TableHead>
            <TableHead className="text-muted-foreground font-medium w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} className="table-row-hover border-border">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                      {getInitials(employee.full_name, employee.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {employee.full_name || employee.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employee.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-muted-foreground">@{employee.username}</span>
              </TableCell>
              <TableCell>
                {employee.is_admin ? (
                  <Badge className="bg-primary/15 text-primary border-0 gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Staff
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={employee.is_active ? "default" : "secondary"}
                  className={employee.is_active 
                    ? "bg-success/15 text-success border-0" 
                    : "bg-muted text-muted-foreground"
                  }
                >
                  {employee.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {new Date(employee.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(employee)}>
                      Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleActive?.(employee)}>
                      {employee.is_active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
