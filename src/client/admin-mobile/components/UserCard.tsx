import React from 'react';
import { User, Mail, Calendar, Activity } from 'lucide-react';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive' | 'pending';
    joinDate: string;
    lastActive: string;
    avatar?: string;
  };
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {user.avatar ? (
            <img
              className="h-12 w-12 rounded-full"
              src={user.avatar}
              alt={user.name}
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="h-6 w-6 text-gray-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>
        <div className="flex-shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              user.status
            )}`}
          >
            {user.status}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center text-sm text-gray-500">
          <Mail className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
          <span>Joined {user.joinDate}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Activity className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
          <span>Last active {user.lastActive}</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
