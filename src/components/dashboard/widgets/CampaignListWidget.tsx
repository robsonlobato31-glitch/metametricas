import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const CampaignListWidget = () => {
  const { data: campaigns, isLoading } = useCampaigns();
  const navigate = useNavigate();

  const topCampaigns = campaigns?.slice(0, 5) || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Campanhas Recentes</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/campanhas')}
        >
          Ver Todas
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : topCampaigns.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Nenhuma campanha encontrada
          </div>
        ) : (
          <div className="space-y-3">
            {topCampaigns.map((campaign: any) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate('/campanhas')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.ad_accounts?.provider === 'meta' ? 'Meta Ads' : 'Google Ads'}
                  </p>
                </div>
                <Badge 
                  variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {campaign.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
