'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/ClientLayout';
import {
  GraduationCap,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  ShieldCheck,
  Building,
  Loader2,
} from 'lucide-react';

export default function CoursesPage() {
  const { currentUser } = useApp();
  const [courses, setCourses] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [technicianStats, setTechnicianStats] = useState<any[]>([]);
  const [companyCoveragePercent, setCompanyCoveragePercent] = useState(100);
  const [totalMandatory, setTotalMandatory] = useState(0);
  const [coveredCount, setCoveredCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Formulário para novo curso
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [addingCourse, setAddingCourse] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.courses || []);
      setTechnicians(data.technicians || []);
      setTechnicianStats(data.technicianStats || []);
      setCompanyCoveragePercent(data.companyCoveragePercent || 0);
      setTotalMandatory(data.totalMandatory || 0);
      setCoveredCount(data.coveredCoursesCount || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleToggleCompletion = async (courseId: string, technicianId: string, currentVal: boolean) => {
    try {
      await fetch('/api/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          technicianId,
          completed: !currentVal,
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });
      fetchCourses();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setAddingCourse(true);
      await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          isMandatory,
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });
      setNewTitle('');
      setNewDescription('');
      fetchCourses();
    } catch (e) {
      console.error(e);
    } finally {
      setAddingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o curso "${title}"?`)) return;

    try {
      await fetch(`/api/courses?id=${id}&userAuthor=${encodeURIComponent(currentUser?.name || 'Admin')}`, {
        method: 'DELETE',
      });
      fetchCourses();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cards de Resumo de Cobertura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cobertura da Empresa (Exibido no Dashboard) */}
        <div className="bg-[#002B49] text-white p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Building className="w-4 h-4" /> Cobertura Geral da Empresa
            </div>
            <p className="text-2xl font-black mt-1 text-white">{companyCoveragePercent}%</p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {coveredCount} de {totalMandatory} cursos cobertos pela equipe técnica
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-black text-cyan-300 text-lg">
            {companyCoveragePercent}%
          </div>
        </div>

        {/* Card 2: Total de Cursos Cadastrados */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4 text-cyan-600" /> Catálogo de Treinamentos
            </div>
            <p className="text-2xl font-black mt-1 text-slate-800">{courses.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{totalMandatory} cursos de caráter obrigatório</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center font-bold text-cyan-700">
            {courses.length}
          </div>
        </div>

        {/* Card 3: Técnicos Cadastrados */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-600" /> Corpo Técnico Ativo
            </div>
            <p className="text-2xl font-black mt-1 text-slate-800">{technicians.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Técnicos avaliados no programa de capacitação</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center font-bold text-emerald-700">
            {technicians.length}
          </div>
        </div>
      </div>

      {/* Visão de Performance Individual dos Técnicos */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-bold text-sm text-[#002B49] mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-600" />
          Aproveitamento Individual por Técnico (Grupo "Técnicos")
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {technicianStats.map((stat) => (
            <div key={stat.technician.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">{stat.technician.name}</span>
                <span className="text-xs font-black text-cyan-700">{stat.percent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-cyan-600 h-full rounded-full transition-all"
                  style={{ width: `${stat.percent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {stat.completedCount} de {stat.totalMandatory} cursos obrigatórios concluídos
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz Completa: Cursos x Técnicos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="font-bold text-sm text-[#002B49]">Matriz de Conclusão de Cursos Obrigatórios</h3>
            <p className="text-xs text-slate-500">
              Marque os cursos concluídos por cada técnico. Basta que um técnico cumpra o curso para cobrir a meta da empresa.
            </p>
          </div>

          {/* Adicionar Novo Curso */}
          <form onSubmit={handleAddCourse} className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Novo curso obrigatório..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600 w-64 bg-white"
            />
            <button
              type="submit"
              disabled={addingCourse || !newTitle.trim()}
              className="px-3 py-1.5 bg-[#002B49] text-white rounded text-xs font-bold hover:bg-[#001B30] flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {addingCourse ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Adicionar Curso
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#002B49] text-white">
              <tr>
                <th className="p-3 font-bold">CURSO OBRIGATÓRIO</th>
                <th className="p-3 font-bold text-center w-28">STATUS EMPRESA</th>
                {technicians.map((t) => (
                  <th key={t.id} className="p-3 font-bold text-center min-w-[120px]">
                    {t.name}
                  </th>
                ))}
                <th className="p-3 font-bold text-center w-16">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => {
                const isCovered = c.technicianCourses?.some((tc: any) => tc.completed);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-cyan-700 shrink-0" />
                        <div>
                          <span>{c.title}</span>
                          {c.description && <p className="text-[11px] text-slate-400">{c.description}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      {isCovered ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Coberto
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 inline-block">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Checkboxes de Conclusão para Cada Técnico */}
                    {technicians.map((t) => {
                      const record = c.technicianCourses?.find((tc: any) => tc.technicianId === t.id);
                      const isDone = Boolean(record?.completed);
                      return (
                        <td key={t.id} className="p-3 text-center">
                          <label className="inline-flex items-center justify-center p-1.5 rounded cursor-pointer hover:bg-slate-100 transition">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => handleToggleCompletion(c.id, t.id, isDone)}
                              className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                            />
                          </label>
                        </td>
                      );
                    })}

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteCourse(c.id, c.title)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                        title="Excluir curso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
