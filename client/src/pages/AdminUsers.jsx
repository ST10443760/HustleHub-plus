import { listUsers } from '../api/admin';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { formatDate } from '../utils/format';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

// Admin only. Shows exactly the fields the API returns for each user - the
// API never sends password hashes, and nothing else is requested.
export default function AdminUsers() {
  const users = useApiData((signal) => listUsers(signal), 'admin-users');
  const list = users.status === 'ready' ? users.data.users : [];

  return (
    <section aria-labelledby="admin-users-title">
      <div className="page-header">
        <h1 id="admin-users-title">Users</h1>
        <p>Everyone registered on HustleHub+, newest first.</p>
      </div>

      {users.status === 'loading' && <LoadingState label="Loading users…" />}
      {users.status === 'error' && <ErrorState message={users.error} onRetry={users.reload} />}
      {users.status === 'ready' && list.length === 0 && <EmptyState title="No users yet" />}

      {users.status === 'ready' && list.length > 0 && (
        <div className="table-wrap card">
          <table className="data-table">
            <caption className="visually-hidden">All users, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {list.map((user) => (
                <tr key={user.id}>
                  <td data-label="Name">{decodeEntities(user.name)}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Role">
                    <span className="role-badge">{user.role}</span>
                  </td>
                  <td data-label="Joined">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
