import { createContext, useContext, ReactNode } from 'react';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';

interface RealtimeAlertsContextType {
  newAlertsCount: number;
  clearNewAlertsCount: () => void;
}

const RealtimeAlertsContext = createContext<RealtimeAlertsContextType | undefined>(undefined);

export const RealtimeAlertsProvider = ({ children }: { children: ReactNode }) => {
  const { newAlertsCount, clearNewAlertsCount } = useRealtimeAlerts();

  return (
    <RealtimeAlertsContext.Provider value={{ newAlertsCount, clearNewAlertsCount }}>
      {children}
    </RealtimeAlertsContext.Provider>
  );
};

export const useRealtimeAlertsContext = () => {
  const context = useContext(RealtimeAlertsContext);
  if (context === undefined) {
    throw new Error('useRealtimeAlertsContext must be used within a RealtimeAlertsProvider');
  }
  return context;
};
