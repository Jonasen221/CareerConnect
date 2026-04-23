import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PullToRefresh from '../components/layout/PullToRefresh';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Users, Briefcase, GraduationCap, Building2, Mail, Shield, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JobManager from '../components/admin/JobManager';
import StudentManager from '../components/admin/StudentManager';
import RecruiterManager from '../components/admin/RecruiterManager';
import EventManager from '../components/admin/EventManager';
import DashboardCalendar from '../components/calendar/DashboardCalendar';
import ProfilePreviewModal from '../components/admin/ProfilePreviewModal';

const StatusBadge = ({ status }) => {
  const styles = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>{status}</span>;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [previewProfile, setPreviewProfile] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {checkAdminAndLoadData();}, []);

  const checkAdminAndLoadData = async () => {
    try {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        navigate('/');
        return;
      }
      setIsAdmin(true);
      await loadData();
    } catch {
      navigate('/');
    }
  };

  const loadData = async (adminCheck = false) => {
    setLoading(true);
    const [s, r, u] = await Promise.all([
      base44.entities.StudentProfile.list(),
      base44.entities.RecruiterProfile.list(),
      base44.entities.User.list(),
    ]);
    setStudents(s);
    setRecruiters(r);
    setAccounts(u);

    setLoading(false);
  };

  const updateStudent = async (id, status) => {await base44.entities.StudentProfile.update(id, { status });loadData();};
  const handleEditAccount = (acc) => { setEditingAccount(acc); setEditRole(acc.role || 'user'); };
  const handleSaveRole = async () => {
    setSavingRole(true);
    await base44.entities.User.update(editingAccount.id, { role: editRole });
    setSavingRole(false);
    setEditingAccount(null);
    loadData();
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      await base44.entities.User.delete(deletingAccount.id);
      setConfirmDelete(false);
      setDeletingAccount(null);
      loadData();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete account');
    }
  };
  const updateRecruiter = async (id, status) => {await base44.entities.RecruiterProfile.update(id, { status });loadData();};

  const pending = (list) => list.filter((i) => i.status === 'pending');
  const approved = (list) => list.filter((i) => i.status === 'approved');

  const StudentRow = ({ s }) => {
    const initials = s.full_name?.split(' ').map((n) => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-[#A8D4E8] transition-colors">
        <button className="flex items-center gap-3 text-left flex-1 min-w-0" onClick={() => {setPreviewProfile(s);setPreviewType('student');}}>
          <Avatar className="w-10 h-10 flex-shrink-0">
            {s.photo_url && <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover rounded-full" />}
            <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 hover:text-[#3D87AA]">{s.full_name}</p>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-sm text-slate-500 truncate">{s.university} · {s.major} {s.graduation_year && `· Class of ${s.graduation_year}`}</p>
          </div>
        </button>
        {s.status === 'pending' &&
        <div className="flex gap-2 flex-shrink-0 ml-2">
            <Button size="sm" variant="outline" onClick={() => updateStudent(s.id, 'rejected')} className="bg-rose-50 text-red-600 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground border-red-200 hover:bg-red-50 h-8"><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
            <Button size="sm" onClick={() => updateStudent(s.id, 'approved')} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] h-8 px-3 text-xs"><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>
          </div>
        }
      </div>);

  };

  const RecruiterRow = ({ r }) => {
    const initials = r.full_name?.split(' ').map((n) => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-[#A8D4E8] transition-colors">
        <button className="flex items-center gap-3 text-left flex-1 min-w-0" onClick={() => {setPreviewProfile(r);setPreviewType('recruiter');}}>
          <Avatar className="w-10 h-10 flex-shrink-0">
            {r.company_logo_url && <img src={r.company_logo_url} alt={r.company} className="w-full h-full object-cover rounded-full" />}
            <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 hover:text-[#3D87AA]">{r.full_name}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-sm text-slate-500 truncate">{r.company} · {r.title} {r.industry && `· ${r.industry}`}</p>
          </div>
        </button>
        {r.status === 'pending' &&
        <div className="flex gap-2 flex-shrink-0 ml-2">
            <Button size="sm" variant="outline" onClick={() => updateRecruiter(r.id, 'rejected')} className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-3 text-xs"><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
            <Button size="sm" onClick={() => updateRecruiter(r.id, 'approved')} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] h-8 px-3 text-xs"><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>
          </div>
        }
      </div>);

  };

  const stats = [
  { label: 'Pending Candidates', count: pending(students).length, icon: GraduationCap, cls: 'bg-amber-100 text-amber-600' },
  { label: 'Pending Recruiters', count: pending(recruiters).length, icon: Briefcase, cls: 'bg-amber-100 text-amber-600' },
  { label: 'Active Candidates', count: approved(students).length, icon: Users, cls: 'bg-indigo-100 text-indigo-600' },
  { label: 'Active Recruiters', count: approved(recruiters).length, icon: Building2, cls: 'bg-violet-100 text-violet-600' }];


  if (isAdmin === null) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Verifying access...</p></div>;
  if (!isAdmin) return null;

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-white">Admin Dashboard ⚙️</h1>
          <p className="text-white/80 mt-1">Manage and approve platform members</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 -mt-8">

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
         {[
            { label: 'Pending Candidates', count: pending(students).length, emoji: '⏳', bg: 'from-[#5BA4C4] to-[#4a90b0]' },
            { label: 'Pending Recruiters', count: pending(recruiters).length, emoji: '⏳', bg: 'from-[#4a90b0] to-[#3D87AA]' },
            { label: 'Active Candidates', count: approved(students).length, emoji: '🎓', bg: 'from-[#3D87AA] to-[#2d6d8e]' },
            { label: 'Active Recruiters', count: approved(recruiters).length, emoji: '💼', bg: 'from-[#2d6d8e] to-[#1e5470]' },
            { label: 'Active Accounts', count: accounts.length, emoji: '👤', bg: 'from-[#1e5470] to-[#143a50]' }].
            map((stat) =>
            <Card key={stat.label} className="border-0 shadow-lg overflow-hidden">
             <CardContent className="p-0">
               <div className={`bg-gradient-to-br ${stat.bg} rounded-2xl p-5 text-white`}>
                 <div className="text-3xl mb-2">{stat.emoji}</div>
                 <p className="text-3xl font-black">{stat.count}</p>
                 <p className="text-xs text-white/80 mt-0.5 font-medium">{stat.label}</p>
               </div>
             </CardContent>
           </Card>
            )}
       </div>



       <div className="mb-6">
        <DashboardCalendar userType="admin" userEmail={null} />
       </div>

       <Tabs defaultValue="pending-students">
        <TabsList className="bg-white shadow-sm border border-slate-100 mb-6 flex-wrap h-auto gap-1">
           <TabsTrigger value="pending-students" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">Pending Candidates {pending(students).length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{pending(students).length}</span>}</TabsTrigger>
           <TabsTrigger value="pending-recruiters" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">Pending Recruiters {pending(recruiters).length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{pending(recruiters).length}</span>}</TabsTrigger>
           <TabsTrigger value="all-students" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">All Candidates</TabsTrigger>
           <TabsTrigger value="all-recruiters" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">All Recruiters</TabsTrigger>
           <TabsTrigger value="manage-jobs" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">💼 Manage Jobs</TabsTrigger>
           <TabsTrigger value="manage-students" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">🎓 Manage Candidates</TabsTrigger>
           <TabsTrigger value="manage-recruiters" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">🏢 Manage Recruiters</TabsTrigger>
           <TabsTrigger value="manage-events" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">📅 Manage Events</TabsTrigger>
           <TabsTrigger value="manage-accounts" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">👤 Manage Accounts</TabsTrigger>
         </TabsList>
        <TabsContent value="pending-students">
          <div className="space-y-3">{loading ? <p className="text-slate-400 text-center py-8">Loading...</p> : pending(students).length === 0 ? <p className="text-slate-400 text-center py-12">No pending applications</p> : pending(students).map((s) => <StudentRow key={s.id} s={s} />)}</div>
        </TabsContent>
        <TabsContent value="pending-recruiters">
           <div className="space-y-3">{loading ? <p className="text-slate-400 text-center py-8">Loading...</p> : pending(recruiters).length === 0 ? <p className="text-slate-400 text-center py-12">No pending applications</p> : pending(recruiters).map((r) => <RecruiterRow key={r.id} r={r} />)}</div>
         </TabsContent>

         <TabsContent value="all-students">
          <div className="space-y-3">{students.map((s) => <StudentRow key={s.id} s={s} />)}</div>
        </TabsContent>
        <TabsContent value="all-recruiters">
          <div className="space-y-3">{recruiters.map((r) => <RecruiterRow key={r.id} r={r} />)}</div>
        </TabsContent>
        <TabsContent value="manage-jobs"><JobManager /></TabsContent>
        <TabsContent value="manage-students"><StudentManager /></TabsContent>
        <TabsContent value="manage-recruiters"><RecruiterManager /></TabsContent>
        <TabsContent value="manage-events"><EventManager /></TabsContent>
        <TabsContent value="manage-accounts">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{accounts.length} total accounts</p>
          </div>
          <div className="space-y-3">
            {accounts.map((acc) => {
              const initials = acc.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';
              const studentProfile = students.find(s => s.created_by === acc.email);
              const recruiterProfile = recruiters.find(r => r.created_by === acc.email);
              const accountType = acc.role === 'admin' ? 'Admin' : studentProfile ? 'Candidate' : recruiterProfile ? 'Recruiter' : 'No Profile';
              const typeColor = acc.role === 'admin' ? 'bg-purple-100 text-purple-700' : studentProfile ? 'bg-blue-100 text-blue-700' : recruiterProfile ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500';
              return (
                <div key={acc.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 bg-[#EAF5FB] rounded-full flex items-center justify-center text-[#3D87AA] font-bold text-sm flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{acc.full_name || '—'}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>{accountType}</span>
                      {acc.role === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-500" />}
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{acc.email}</p>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
                    Joined {new Date(acc.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <button onClick={() => handleEditAccount(acc)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#3D87AA] transition-colors flex-shrink-0">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => {setDeletingAccount(acc);setConfirmDelete(true);}} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {accounts.length === 0 && <p className="text-slate-400 text-center py-12">No accounts found</p>}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
      <ProfilePreviewModal
        open={!!previewProfile}
        onOpenChange={(open) => {if (!open) setPreviewProfile(null);}}
        profile={previewProfile}
        type={previewType}
        onApprove={(id) => {previewType === 'student' ? updateStudent(id, 'approved') : updateRecruiter(id, 'approved');setPreviewProfile(null);}}
        onReject={(id) => {previewType === 'student' ? updateStudent(id, 'rejected') : updateRecruiter(id, 'rejected');setPreviewProfile(null);}} />

      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          {editingAccount && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="font-semibold text-slate-800">{editingAccount.full_name}</p>
                <p className="text-sm text-slate-500">{editingAccount.email}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Role</label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveRole} disabled={savingRole} className="w-full">{savingRole ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={(open) => { if (!open) {setConfirmDelete(false);setDeletingAccount(null);} }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Account</DialogTitle></DialogHeader>
          {deletingAccount && (
            <div className="space-y-4 pt-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">Are you sure you want to permanently delete this account?</p>
                <p className="text-xs text-red-600 mt-1">{deletingAccount.full_name} ({deletingAccount.email})</p>
              </div>
              <p className="text-xs text-slate-500">This action cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {setConfirmDelete(false);setDeletingAccount(null);}} className="flex-1">Cancel</Button>
                <Button onClick={handleDeleteAccount} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Delete Account</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </PullToRefresh>);

}