import { Home } from "lucide-react";
import { Link } from "react-router-dom";

const HomeNav = () => {
  return (
    <Link 
      to="/" 
      className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent/10 transition-colors"
      title="Home"
    >
      <Home className="w-5 h-5" />
    </Link>
  );
};

export default HomeNav; 