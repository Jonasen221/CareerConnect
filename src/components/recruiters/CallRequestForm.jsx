import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock } from 'lucide-react';

export default function CallRequestForm({ isOpen, onClose, student, recruiter, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_time: '',
    message: '',
    job_title: '',
  });

  const handleSubmit = async () => {
    if (!formData.proposed_date) {
      alert('Please select a date');
      return;
    }
    await onSubmit(formData);
    setFormData({ proposed_date: '', proposed_time: '', message: '', job_title: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Request a Call</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-xs text-slate-600 mb-1">Reaching out to</p>
            <p className="font-bold text-slate-800">{student?.full_name}</p>
          </div>

          <div>
            <Label className="text-sm font-semibold text-slate-700">Job Title *</Label>
            <Input
              value={formData.job_title}
              onChange={e => setFormData(p => ({ ...p, job_title: e.target.value }))}
              className="mt-1.5"
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Calendar className="w-4 h-4" />Proposed Date *</Label>
              <Input
                type="date"
                value={formData.proposed_date}
                onChange={e => setFormData(p => ({ ...p, proposed_date: e.target.value }))}
                className="mt-1.5"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Clock className="w-4 h-4" />Time (Optional)</Label>
              <Input
                type="time"
                value={formData.proposed_time}
                onChange={e => setFormData(p => ({ ...p, proposed_time: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-slate-700">Message</Label>
            <Textarea
              value={formData.message}
              onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
              className="mt-1.5 resize-none"
              rows={3}
              placeholder="Tell them about the opportunity, role, or why you want to talk..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">
              {isLoading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}