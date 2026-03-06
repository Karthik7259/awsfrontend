"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { apiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type DepartmentAdminRow = {
  id: number;
  full_name: string;
  email: string;
  department: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
};

type DepartmentAdminListResponse = {
  success: boolean;
  data: DepartmentAdminRow[];
};

type DepartmentAdminActionResponse = {
  success: boolean;
  message: string;
  data: DepartmentAdminRow;
};

type DepartmentAdminDeleteResponse = {
  success: boolean;
  message: string;
  deleted_id: number;
};

export function SuperDashboard() {
  const [admins, setAdmins] = useState<DepartmentAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const pendingApprovalCount = useMemo(
    () => admins.filter((item) => item.email_verified && !item.is_active).length,
    [admins],
  );

  const pendingVerificationCount = useMemo(
    () => admins.filter((item) => !item.email_verified).length,
    [admins],
  );

  const approvedCount = useMemo(
    () => admins.filter((item) => item.is_active).length,
    [admins],
  );

  async function loadAdmins() {
    setLoading(true);

    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token) {
        toast({
          title: "Authentication error",
          description: "Admin token not found. Please login again.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(apiUrl("/admin/department-admins"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as DepartmentAdminListResponse | { detail?: string };
      if (!response.ok) {
        throw new Error(typeof data === "object" && data && "detail" in data ? data.detail || "Failed to load admins" : "Failed to load admins");
      }

      const successData = data as DepartmentAdminListResponse;
      setAdmins(successData.data);
    } catch (requestError) {
      toast({
        title: "Failed to load admins",
        description: requestError instanceof Error ? requestError.message : "Failed to load admins",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdmins();
  }, []);

  async function handleApprove(adminId: number) {
    setApprovingId(adminId);

    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token) {
        throw new Error("Admin token not found. Please login again.");
      }

      const response = await fetch(apiUrl(`/admin/department-admins/${adminId}/approve`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as DepartmentAdminActionResponse | { detail?: string };
      if (!response.ok) {
        throw new Error(typeof data === "object" && data && "detail" in data ? data.detail || "Approval failed" : "Approval failed");
      }

      const successData = data as DepartmentAdminActionResponse;
      setAdmins((prev) => prev.map((item) => (item.id === adminId ? successData.data : item)));
      toast({
        title: "Access updated",
        description: successData.message,
      });
    } catch (requestError) {
      toast({
        title: "Approval failed",
        description: requestError instanceof Error ? requestError.message : "Approval failed",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDelete(adminId: number) {
    const confirmed = window.confirm("Delete this department admin user from database?");
    if (!confirmed) {
      return;
    }

    setDeletingId(adminId);

    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token) {
        throw new Error("Admin token not found. Please login again.");
      }

      const response = await fetch(apiUrl(`/admin/department-admins/${adminId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as DepartmentAdminDeleteResponse | { detail?: string };
      if (!response.ok) {
        throw new Error(typeof data === "object" && data && "detail" in data ? data.detail || "Delete failed" : "Delete failed");
      }

      const successData = data as DepartmentAdminDeleteResponse;
      setAdmins((prev) => prev.filter((item) => item.id !== successData.deleted_id));
      toast({
        title: "User deleted",
        description: successData.message,
      });
    } catch (requestError) {
      toast({
        title: "Delete failed",
        description: requestError instanceof Error ? requestError.message : "Delete failed",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ml-64 p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Review department admins and permit account access.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Pending Approval</div>
            <div className="text-3xl font-bold text-amber-600">{pendingApprovalCount}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Pending OTP Verification</div>
            <div className="text-3xl font-bold text-slate-600">{pendingVerificationCount}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Approved Admins</div>
            <div className="text-3xl font-bold text-emerald-600">{approvedCount}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Department Admin Requests</h2>
            <button
              type="button"
              onClick={() => void loadAdmins()}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-secondary"
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading department admins...</div>
          ) : admins.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No department admin signups yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Department</th>
                    <th className="px-4 py-3 text-left font-medium">Email OTP</th>
                    <th className="px-4 py-3 text-left font-medium">Access</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => {
                    const canApprove = admin.email_verified && !admin.is_active;
                    return (
                      <tr key={admin.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-3">{admin.full_name}</td>
                        <td className="px-4 py-3">{admin.email}</td>
                        <td className="px-4 py-3">{admin.department}</td>
                        <td className="px-4 py-3">
                          {admin.email_verified ? (
                            <span className="px-2 py-1 rounded-md text-xs bg-emerald-100 text-emerald-700">Verified</span>
                          ) : (
                            <span className="px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-700">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {admin.is_active ? (
                            <span className="px-2 py-1 rounded-md text-xs bg-emerald-100 text-emerald-700">Permitted</span>
                          ) : (
                            <span className="px-2 py-1 rounded-md text-xs bg-amber-100 text-amber-700">Blocked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{new Date(admin.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleApprove(admin.id)}
                              disabled={!canApprove || approvingId === admin.id || deletingId === admin.id}
                              className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {approvingId === admin.id ? "Approving..." : "Permit Access"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(admin.id)}
                              disabled={approvingId === admin.id || deletingId === admin.id}
                              className="px-3 py-1.5 rounded-md text-xs font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === admin.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
