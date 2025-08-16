import React from 'react';
import { Card, CardContent } from './ui/card';
import { Footprints } from 'lucide-react';

interface StepCounterProps {
  steps: number;
  goal: number;
  progressPercentage: number;
  isLoading?: boolean;
}

export function StepCounter({ steps, goal, progressPercentage, isLoading = false }: StepCounterProps) {
  // Format step count with commas
  const formatSteps = (count: number): string => {
    return count.toLocaleString();
  };



  return (
    <Card className="bg-gradient-to-br from-[var(--warm-sage)]/20 to-[var(--warm-mint)]/10 backdrop-blur-sm border-[var(--warm-sage)]/30 shadow-lg">
      <CardContent className="p-4 relative overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        
        {/* Content */}
        <div className="relative">
          {/* Header with footsteps icon */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-green-400/20 rounded-lg">
                <Footprints 
                  className="w-4 h-4" 
                  style={{ color: '#4ade80' }} // Neon green
                />
              </div>
            </div>
            {isLoading && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>

          {/* Large step count */}
          <div className="mb-4">
            <div className="text-2xl font-medium text-[var(--warm-brown)] mb-1">
              {formatSteps(steps)}
            </div>
            <div className="text-xs text-[var(--warm-brown)]/60">
              steps today
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full bg-[var(--warm-brown)]/20 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progressPercentage}%`,
                  backgroundColor: '#4ade80' // Neon green
                }}
              />
            </div>
            
            {/* Goal text */}
            <div className="text-xs text-[var(--warm-brown)]/50">
              Goal: {formatSteps(goal)}
            </div>
          </div>
        </div>

        {/* Subtle shine effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      </CardContent>
    </Card>
  );
}