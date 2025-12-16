// app/about/page.tsx
import AboutContent from '@/components/about/about-content';

export const metadata = {
  title: 'About Nexus - Modern Social Platform',
  description: 'Learn about Nexus social platform, its features, technology stack, and creator Alen',
};

export default function AboutPage() {
  return <AboutContent />;
}