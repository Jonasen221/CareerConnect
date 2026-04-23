import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, CheckCircle, XCircle } from 'lucide-react';

export default function CandidateCompare({ candidates, aiScores = {}, onClose }) {
  if (!candidates || candidates.length < 2) return null;

  // Collect all unique skills across all candidates
  const allSkills = [...new Set(candidates.flatMap(c => c.skills || []))].sort();
  const allLanguages = [...new Set(candidates.flatMap(c => c.languages || []))].sort();

  const fields = [
    { label: 'University', render: c => c.university || '—' },
    { label: 'Major', render: c => c.major || '—' },
    { label: 'Grad Year', render: c => c.graduation_year || '—' },
    { label: 'Location', render: c => c.location || '—' },
    { label: 'GPA', render: c => c.gpa || '—' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <DialogTitle className="text-lg font-bold text-[#2E3F4F]">Candidate Comparison</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#EAF5FB]">
                <th className="text-left px-5 py-3 font-semibold text-[#3D87AA] w-36">Criteria</th>
                {candidates.map(c => (
                  <th key={c.id} className="px-4 py-3 text-center min-w-[160px]">
                    <div className="font-bold text-[#2E3F4F]">{c.full_name}</div>
                    {aiScores[c.id] !== undefined && (
                      <div className="mt-1 inline-flex items-center gap-1 bg-[#3D87AA] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {aiScores[c.id]} AI Match
                      </div>
                    )}
                    {c.resume_url && (
                      <a href={c.resume_url} target="_blank" rel="noopener noreferrer"
                        className="mt-1 flex items-center justify-center gap-1 text-[#5BA4C4] hover:underline text-xs">
                        <FileText className="w-3 h-3" /> CV
                      </a>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Basic fields */}
              {fields.map(field => (
                <tr key={field.label} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-[#7A7870] whitespace-nowrap">{field.label}</td>
                  {candidates.map(c => (
                    <td key={c.id} className="px-4 py-3 text-center text-[#2E3F4F]">{field.render(c)}</td>
                  ))}
                </tr>
              ))}

              {/* Work preferences */}
              <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-semibold text-[#7A7870]">Preferences</td>
                {candidates.map(c => (
                  <td key={c.id} className="px-4 py-3 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(c.work_preferences || []).length > 0
                        ? c.work_preferences.map(p => (
                            <span key={p} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full capitalize">{p.replace('_', ' ')}</span>
                          ))
                        : <span className="text-slate-400">—</span>
                      }
                    </div>
                  </td>
                ))}
              </tr>

              {/* Skills comparison */}
              {allSkills.length > 0 && (
                <>
                  <tr className="bg-[#F8F6F4]">
                    <td colSpan={candidates.length + 1} className="px-5 py-2 text-xs font-bold text-[#8FAFC4] uppercase tracking-wider">Skills</td>
                  </tr>
                  {allSkills.map(skill => {
                    const hasAny = candidates.some(c => (c.skills || []).includes(skill));
                    if (!hasAny) return null;
                    return (
                      <tr key={skill} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-2.5 text-[#7A7870]">{skill}</td>
                        {candidates.map(c => (
                          <td key={c.id} className="px-4 py-2.5 text-center">
                            {(c.skills || []).includes(skill)
                              ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                              : <XCircle className="w-4 h-4 text-slate-200 mx-auto" />
                            }
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </>
              )}

              {/* Languages comparison */}
              {allLanguages.length > 0 && (
                <>
                  <tr className="bg-[#F8F6F4]">
                    <td colSpan={candidates.length + 1} className="px-5 py-2 text-xs font-bold text-[#8FAFC4] uppercase tracking-wider">Languages</td>
                  </tr>
                  {allLanguages.map(lang => (
                    <tr key={lang} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5 text-[#7A7870]">{lang}</td>
                      {candidates.map(c => (
                        <td key={c.id} className="px-4 py-2.5 text-center">
                          {(c.languages || []).includes(lang)
                            ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            : <XCircle className="w-4 h-4 text-slate-200 mx-auto" />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}