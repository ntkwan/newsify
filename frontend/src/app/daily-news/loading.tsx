import type React from 'react';

const Loading: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-t-transparent border-b-transparent border-l-transparent border-r-transparent border-t-2 border-r-2 border-black rounded-full">
                Loading...
            </div>
        </div>
    );
};

export default Loading;
