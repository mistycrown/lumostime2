import React from 'react';
import { Activity } from '../types';

interface ActivityItemProps {
  activity: Activity;
  onClick: (activity: Activity) => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onClick }) => {
  return (
    <div 
      className="flex flex-col items-center gap-2 cursor-pointer group"
      onClick={() => onClick(activity)}
    >
      <div 
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-sm transition-transform group-hover:scale-105 group-active:scale-95 ${activity.color}`}
      >
        {activity.icon}
      </div>
      <span className="text-xs md:text-sm text-stone-600 font-medium text-center max-w-[80px] leading-tight">
        {activity.name}
      </span>
    </div>
  );
};