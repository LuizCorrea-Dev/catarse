import React from 'react';

const PostSkeleton: React.FC = () => {
  return (
    <div className="mx-auto w-full overflow-hidden rounded-2xl bg-slate-800/40 border border-slate-700/50 mb-6 p-5">
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar Shimmer */}
        <div className="h-9 w-9 rounded-full shimmer-effect" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded shimmer-effect" />
          <div className="h-2 w-16 rounded shimmer-effect opacity-50" />
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="h-4 w-full rounded shimmer-effect" />
        <div className="h-4 w-[90%] rounded shimmer-effect" />
      </div>

      {/* Media Placeholder */}
      <div className="w-full h-48 rounded-xl mb-4 shimmer-effect opacity-30" />

      <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
        <div className="h-8 w-20 rounded-full shimmer-effect" />
        <div className="flex gap-4">
          <div className="h-6 w-6 rounded-full shimmer-effect" />
        </div>
      </div>
    </div>
  );
};

export default PostSkeleton;