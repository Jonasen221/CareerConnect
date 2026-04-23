import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle } from 'lucide-react';

export default function JobCompare({ jobs, onClose }) {
  if (!jobs || jobs.length < 2) return null;

  const allSkills = [...new Set(jobs.flatMap(j => j.required_skills || []))].sort();
  const allLanguages = [...new Set(jobs.flatMap(j => j.required_languages || []))].sort();
  const allPerks = [...new Set(jobs.flatMap(j => j.perks || []))].sort();

  const fields = [
    { label: 'Company', render: j => j.company || '—' },
    { label: 'Type', render: j => j.type ? j.type.replace('_', ' ') : '—' },
    { label: 'Location', render: j => j.location || '—' },
    { label: 'Salary', render: j => j.salary_range || (j.salary_min ? `£${j.salary_min}–£${j.salary_max}` : '—') },
    { label: 'Grad Year', render: j => j.grad_year_min ? `${j.grad_year_min}–${j.grad_year_max || j.grad_year_min}` : '—' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <DialogTitle className="text-lg font-bold text-[#2E3F4F]">Job Comparison</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#EAF5FB]">
                <th className="text-left px-5 py-3 font-semibold text-[#3D87AA] w-36">Criteria</th>
                {jobs.map(j => (
                  <th key={j.id} className="px-4 py-3 text-center min-w-[160px]">
                    <div className="font-bold text-[#2E3F4F]">{j.title}</div>
                    <div className="text-xs text-[#7A7870] font-normal mt-0.5">{j.company}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.label} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-[#7A7870] whitespace-nowrap">{field.label}</td>
                  {jobs.map(j => (
                    <td key={j.id} className="px-4 py-3 text-center text-[#2E3F4F] capitalize">{field.render(j)}</td>
                  ))}
                </tr>
              ))}

              {/* Description snippet */}
              <tr className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-3 font-semibold text-[#7A7870]">About</td>
                {jobs.map(j => (
                  <td key={j.id} className="px-4 py-3 text-center text-xs text-[#7A7870]">
                    {j.description ? j.description.slice(0, 100) + (j.description.length > 100 ? '...' : '') : '—'}
                  </td>
                ))}
              </tr>

              {/* Skills */}
              {allSkills.length > 0 && (
                <>
                  <tr className="bg-[#F8F6F4]">
                    <td colSpan={jobs.length + 1} className="px-5 py-2 text-xs font-bold text-[#8FAFC4] uppercase tracking-wider">Required Skills</td>
                  </tr>
                  {allSkills.map(skill => (
                    <tr key={skill} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5 text-[#7A7870]">{skill}</td>
                      {jobs.map(j => (
                        <td key={j.id} className="px-4 py-2.5 text-center">
                          {(j.required_skills || []).includes(skill)
                            ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            : <XCircle className="w-4 h-4 text-slate-200 mx-auto" />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {/* Languages */}
              {allLanguages.length > 0 && (
                <>
                  <tr className="bg-[#F8F6F4]">
                    <td colSpan={jobs.length + 1} className="px-5 py-2 text-xs font-bold text-[#8FAFC4] uppercase tracking-wider">Languages</td>
                  </tr>
                  {allLanguages.map(lang => (
                    <tr key={lang} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5 text-[#7A7870]">{lang}</td>
                      {jobs.map(j => (
                        <td key={j.id} className="px-4 py-2.5 text-center">
                          {(j.required_languages || []).includes(lang)
                            ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            : <XCircle className="w-4 h-4 text-slate-200 mx-auto" />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {/* Perks */}
              {allPerks.length > 0 && (
                <>
                  <tr className="bg-[#F8F6F4]">
                    <td colSpan={jobs.length + 1} className="px-5 py-2 text-xs font-bold text-[#8FAFC4] uppercase tracking-wider">Perks</td>
                  </tr>
                  {allPerks.map(perk => (
                    <tr key={perk} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5 text-[#7A7870]">{perk}</td>
                      {jobs.map(j => (
                        <td key={j.id} className="px-4 py-2.5 text-center">
                          {(j.perks || []).includes(perk)
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