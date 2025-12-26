'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Clock, XCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Invitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface InvitationTableProps {
  invitations: Invitation[];
}

export function InvitationTable({ invitations }: InvitationTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const getStatus = (invitation: Invitation) => {
    if (invitation.used_at) return 'used';
    if (new Date(invitation.expires_at) < new Date()) return 'expired';
    return 'pending';
  };

  const copyInviteLink = async (token: string, id: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/employee/register?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({
      title: "Link copied",
      description: "Invitation link copied to clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusConfig = {
    pending: { 
      icon: Clock, 
      label: 'Pending', 
      className: 'bg-warning/15 text-warning border-0' 
    },
    used: { 
      icon: CheckCircle, 
      label: 'Used', 
      className: 'bg-success/15 text-success border-0' 
    },
    expired: { 
      icon: XCircle, 
      label: 'Expired', 
      className: 'bg-muted text-muted-foreground' 
    },
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Email</TableHead>
            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Expires</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Created</TableHead>
            <TableHead className="text-muted-foreground font-medium w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const status = getStatus(invitation);
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            
            return (
              <TableRow key={invitation.id} className="table-row-hover border-border">
                <TableCell>
                  <span className="font-medium text-foreground">
                    {invitation.email}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={config.className}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {new Date(invitation.expires_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {new Date(invitation.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  {status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyInviteLink(invitation.token, invitation.id)}
                    >
                      {copiedId === invitation.id ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
