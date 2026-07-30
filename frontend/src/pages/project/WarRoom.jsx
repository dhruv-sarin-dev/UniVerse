import { useOutletContext, Navigate } from 'react-router-dom';
import WarRoomChat from '../../components/WarRoomChat';
import { useAuth } from '../../context/AuthContext';

export default function WarRoom() {
  const { project, isMember } = useOutletContext();
  const { user } = useAuth();

  if (!isMember) {
    return <Navigate to={`/projects/${project.id}`} replace />;
  }

  return (
    <div className="animate-in fade-in z-10 w-full h-[600px] bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <WarRoomChat project={project} user={user} />
    </div>
  );
}
