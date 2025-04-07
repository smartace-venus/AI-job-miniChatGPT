import React, { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Code, Cloud, Code2 } from 'lucide-react';
import { type User } from '@supabase/supabase-js';

interface BannerProps {
  session: Promise<User | null>;
}

interface FeatureProps {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ Icon, title, description }) => (
  <div className="flex items-center gap-3 mb-4">
    <Icon className="h-5 w-5 text-secondary" />
    <div>
      <h6 className="font-bold text-foreground">{title}</h6>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const BannerComponent: React.FC<BannerProps> = ({ session }) => {
  const userSession = use(session);
  const isSessionAvailable = userSession !== null;
  const userEmail = userSession?.email;

  return (
    <div className="flex flex-col gap-4 items-center justify-center p-20 bg-gray-200">
        <h4 className="text-primary font-bold text-2xl mb-3">
          {isSessionAvailable
            ? `Welcome back, ${userEmail ?? 'User'}!`
            : 'Empower Your Next.js App with Supabase Auth'}
        </h4>
        <p className="mb-6 text-muted-foreground">
          {isSessionAvailable
            ? 'Dive into the enhanced features and capabilities tailored for your development.'
            : 'Our library seamlessly integrates with Next.js 14, offering server-side rendering support and efficient data fetching with React Server Components.'}
        </p>

        <div className="space-y-4 mb-6">
          <Feature
            Icon={Shield}
            title="Enhanced Security"
            description="State-of-the-art security for your apps."
          />
          <Feature
            Icon={Zap}
            title="Blazing Fast"
            description="Optimized for speed, making your apps run smoother."
          />
          <Feature
            Icon={Code}
            title="Developer Friendly"
            description="Easy to use API and thorough documentation."
          />
          <Feature
            Icon={Cloud}
            title="Cloud Integration"
            description="Seamless cloud capabilities with Supabase."
          />
          <Feature
            Icon={Code2}
            title="Easy Integration"
            description="Simple steps to integrate with your Next.js app."
          />
        </div>

        <Button asChild size="lg" className="mt-2">
          <Link href={isSessionAvailable ? '/aichat' : '/signin'}>
            {isSessionAvailable ? 'Explore AI Chat' : 'Get Started Now'}
          </Link>
        </Button>
    </div>
  );
};

export default BannerComponent;
