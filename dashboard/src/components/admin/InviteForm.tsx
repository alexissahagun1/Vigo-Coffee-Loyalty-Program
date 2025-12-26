'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, UserPlus, Loader2 } from "lucide-react";

interface InviteFormProps {
  onInviteCreated?: () => void;
}

export function InviteForm({ onInviteCreated }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/admin/create-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invitation');
      }

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${email}. Invite URL: ${data.inviteUrl}`,
      });
      
      setEmail("");
      onInviteCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to send invitation',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-primary" />
        <h3 className="font-display text-xl font-semibold">Invite Employee</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Send an invitation link to add a new team member.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="employee@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invitation
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
