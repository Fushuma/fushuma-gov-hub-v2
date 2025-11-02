import { LucideIcon } from 'lucide-react';

interface DocHeroProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  showLogo?: boolean;
}

export function DocHero({ title, description, icon: Icon, showLogo = false }: DocHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 via-background to-background border border-border mb-8">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="relative px-8 py-12 md:px-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              {Icon && (
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-8 w-8" />
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-bold">{title}</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl">
              {description}
            </p>
          </div>
          {showLogo && (
            <div className="flex-shrink-0">
              <img
                src="/fushuma-icon-large.webp"
                alt="Fushuma"
                width="200"
                height="200"
                className="opacity-80 max-w-[200px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
