import { useOutletContext, Navigate } from 'react-router-dom';
import ContributionTracker from '../../components/ContributionTracker';

export default function Contributions() {
  const { project, isMember, isOwner } = useOutletContext();

  if (!isMember) {
    return <Navigate to={`/projects/${project.id}`} replace />;
  }

  return (
    <div className="animate-in fade-in">
      <ContributionTracker projectId={project.id} isOwner={isOwner} />
    </div>
  );
}
