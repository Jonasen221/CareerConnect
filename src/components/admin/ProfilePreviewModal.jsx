import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, XCircle, ExternalLink, MapPin, GraduationCap, Briefcase, Globe, Linkedin } from 'lucide-react';

export default function ProfilePreviewModal({ profile, type, open, onOpenChange, onApprove, onReject }) {
  if (!profile) return null;

  const initials = profile.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type === 'student' ? '🎓 Candidate Profile' : '💼 Recruiter Profile'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {profile.photo_url && <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover rounded-full" />}
              {profile.company_logo_url && !profile.photo_url && <img src={profile.company_logo_url} alt={profile.company} className="w-full h-full object-cover rounded-full" />}
              <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
              {type === 'student' ? (
                <p className="text-sm text-slate-500">{profile.university} {profile.major && `· ${profile.major}`}</p>
              ) : (
                <p className="text-sm text-slate-500">{profile.title} {profile.company && `at ${profile.company}`}</p>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                profile.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                profile.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>{profile.status}</span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 text-sm">
            {type === 'student' ? (
              <>
                {profile.graduation_year && <div className="flex items-center gap-2 text-slate-600"><GraduationCap className="w-4 h-4 text-[#5BA4C4]" /><span>Class of {profile.graduation_year}{profile.graduation_month ? ` (Month ${profile.graduation_month})` : ''}</span></div>}
                {profile.location && <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-[#5BA4C4]" /><span>{profile.location}</span></div>}
                {profile.gpa && <div className="flex items-center gap-2 text-slate-600"><span className="text-[#5BA4C4] font-bold">GPA</span><span>{profile.gpa}</span></div>}
                {profile.skills?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Skills</p>
                    <div className="flex flex-wrap gap-1.5">{profile.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                  </div>
                )}
                {profile.languages?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Languages</p>
                    <div className="flex flex-wrap gap-1.5">{profile.languages.map(l => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}</div>
                  </div>
                )}
                {profile.work_preferences?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Work Preferences</p>
                    <div className="flex flex-wrap gap-1.5">{profile.work_preferences.map(w => <Badge key={w} variant="outline" className="text-xs bg-[#EAF5FB] text-[#3D87AA]">{w}</Badge>)}</div>
                  </div>
                )}
                {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#3D87AA] hover:underline"><Linkedin className="w-4 h-4" />LinkedIn Profile</a>}
                {profile.resume_url && <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#3D87AA] hover:underline"><ExternalLink className="w-4 h-4" />View Resume</a>}
                {profile.intro_video_url && <a href={profile.intro_video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#3D87AA] hover:underline"><ExternalLink className="w-4 h-4" />Intro Video</a>}
              </>
            ) : (
              <>
                {profile.industry && <div className="flex items-center gap-2 text-slate-600"><Briefcase className="w-4 h-4 text-[#5BA4C4]" /><span>{profile.industry}</span></div>}
                {profile.company_website && <a href={profile.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#3D87AA] hover:underline"><Globe className="w-4 h-4" />{profile.company_website}</a>}
                {profile.intro_video_url && <a href={profile.intro_video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#3D87AA] hover:underline"><ExternalLink className="w-4 h-4" />Intro Video</a>}
              </>
            )}

            {profile.bio && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bio</p>
                <p className="text-slate-600 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            <p className="text-xs text-slate-400">Account: {profile.created_by}</p>
          </div>

          {/* Actions */}
          {profile.status === 'pending' && (
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => { onReject(profile.id); onOpenChange(false); }} className="flex-1 text-[#5BA4C4] border-[#A8D4E8] hover:bg-[#EAF5FB]">
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button onClick={() => { onApprove(profile.id); onOpenChange(false); }} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
                <CheckCircle className="w-4 h-4 mr-1" /> Approve
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}