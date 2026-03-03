"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/format";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  createdAt: string;
}

interface InviteResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tempPassword: string;
  message: string;
}

export default function SettingsTeamPage() {
  const { data: session } = useSession();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "TEAM">("TEAM");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResponse | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/ops-desk/team");
      if (!response.ok) throw new Error("Failed to fetch team members");
      const data = await response.json();
      setTeamMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setInviteError(null);
    setIsInviting(true);

    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to invite user");
      }

      const data = await response.json();
      setInviteResult(data);
      setShowSuccessDialog(true);

      // Reset form
      setInviteEmail("");
      setInviteName("");
      setInviteRole("TEAM");

      // Refresh team members
      await fetchTeamMembers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const copyPassword = () => {
    if (inviteResult?.tempPassword) {
      navigator.clipboard.writeText(inviteResult.tempPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "TEAM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "CLIENT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Team</h1>
        <div className="text-center py-12 text-muted-foreground">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="text-muted-foreground mt-1">
          Manage team members and invite new people to your organization.
        </p>
      </div>

      {/* Invite Form - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Send an invitation to add a new team member. They&apos;ll receive a temporary password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="member@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input
                    id="invite-name"
                    type="text"
                    placeholder="John Doe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(value: "ADMIN" | "TEAM") => setInviteRole(value)}>
                  <SelectTrigger id="invite-role" className="w-full md:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEAM">Team Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Team members can view and manage projects. Admins have full access.
                </p>
              </div>

              {inviteError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  {inviteError}
                </div>
              )}

              <Button type="submit" disabled={isInviting}>
                {isInviting ? "Inviting..." : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {teamMembers.length} {teamMembers.length === 1 ? "member" : "members"} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No team members found</div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-zinc-900 text-white">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{member.email}</span>
                        <span>•</span>
                        <span>Joined {formatDate(member.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Future: Add role change and deactivate buttons here */}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Invitation Sent Successfully
            </DialogTitle>
            <DialogDescription>
              The team member has been created. Share this temporary password with them securely.
            </DialogDescription>
          </DialogHeader>
          {inviteResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="p-2 rounded border bg-muted text-sm">
                  {inviteResult.user.email}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 rounded border bg-muted font-mono text-sm">
                    {inviteResult.tempPassword}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    className={passwordCopied ? "text-green-600" : ""}
                  >
                    {passwordCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This password will only be shown once. Make sure to copy it before closing this dialog.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
