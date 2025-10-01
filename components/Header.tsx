import Link from 'next/link';
import Image from 'next/image';
import ProfileDropdown from './ProfileDropdown';

export default function Header() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center bg-white border-b fixed border-b-slate-200 w-full">
      <Link className="flex items-center justify-center" href="/forum">
        <Image src="/logo.png" alt="logo" width={50} height={50} />
        <span className="sr-only">Forum</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        <ProfileDropdown />
      </nav>
    </header>
  );
}
