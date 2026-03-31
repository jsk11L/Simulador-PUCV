import { Shield, Users } from 'lucide-react';

interface AdminUsuario {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

interface AdminViewProps {
  adminUsuarios: AdminUsuario[];
  onToggleApproval: (userId: string, currentApproved: boolean) => void;
}

export default function AdminView({ adminUsuarios, onToggleApproval }: AdminViewProps) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <Shield size={28} className="text-amber-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Panel de Administración</h2>
          <p className="text-sm text-slate-500">Gestiona las cuentas de usuario de la plataforma</p>
        </div>
      </div>

      {adminUsuarios.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium">No hay usuarios registrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Registro</th>
                <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody>
              {adminUsuarios.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${u.is_admin ? 'bg-amber-500' : 'bg-blue-500'}`}>
                        {u.email[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">{u.email}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${u.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-2 h-2 rounded-full ${u.is_approved ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {u.is_approved ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                        <Shield size={12} /> Admin
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Usuario</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString('es-CL')}</td>
                  <td className="p-4 text-center">
                    {!u.is_admin && (
                      <button
                        onClick={() => onToggleApproval(u.id, u.is_approved)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${u.is_approved ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      >
                        {u.is_approved ? 'Revocar' : 'Aprobar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-bold">{adminUsuarios.length}</span> usuarios registrados ·
              <span className="font-bold text-emerald-600"> {adminUsuarios.filter((u) => u.is_approved).length}</span> aprobados ·
              <span className="font-bold text-red-600"> {adminUsuarios.filter((u) => !u.is_approved).length}</span> pendientes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
