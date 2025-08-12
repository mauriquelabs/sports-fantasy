import { Button } from "@/components/ui/button";
import { Trophy, Users, TrendingUp, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.pexels.com/photos/14460275/pexels-photo-14460275.jpeg')`,
        }}
      >
        <div className="text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Your Game.
            <br />
            Your League.
            <br />
            Your Rules.
          </h1>
          <p className="text-xl md:text-2xl mb-8 font-medium text-gray-200 max-w-2xl mx-auto leading-relaxed">
            Create your league, draft real players, and compete with friends —
            all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-200 transform hover:scale-105"
              asChild
            >
              <Link to="/signup">Sign Up</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white bg-transparent hover:bg-white hover:text-gray-900 font-bold py-4 px-8 text-lg rounded-lg transition-all duration-200 transform hover:scale-105"
              asChild
            >
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16 text-gray-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-primary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Create a League
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Set up your private league and invite friends to join the
                ultimate fantasy sports experience.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Draft Your Team
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Experience real-time drafting with interactive boards and
                strategic player selection tools.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Compete Weekly
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Track live scores and compete against friends with real player
                statistics and dynamic leaderboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            Feature Highlights
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gray-800 rounded-xl p-8 hover:bg-gray-700 transition-colors duration-200">
              <div className="bg-primary rounded-lg w-12 h-12 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Private Leagues</h3>
              <p className="text-gray-300 leading-relaxed">
                Create exclusive leagues with custom rules and invite only your
                closest friends and competitors.
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 hover:bg-gray-700 transition-colors duration-200">
              <div className="bg-primary rounded-lg w-12 h-12 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Real-time Drafting</h3>
              <p className="text-gray-300 leading-relaxed">
                Experience lightning-fast drafts with live updates, timer
                controls, and interactive draft boards.
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 hover:bg-gray-700 transition-colors duration-200">
              <div className="bg-primary rounded-lg w-12 h-12 flex items-center justify-center mb-6">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Real Player Stats</h3>
              <p className="text-gray-300 leading-relaxed">
                Get up-to-the-minute player statistics and performance data
                directly integrated into your leagues.
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 hover:bg-gray-700 transition-colors duration-200">
              <div className="bg-primary rounded-lg w-12 h-12 flex items-center justify-center mb-6">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">In-game Economy</h3>
              <p className="text-gray-300 leading-relaxed">
                Trade players, negotiate contracts, and manage your team's
                budget with advanced economic features.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-2xl font-black text-white mb-2">
                YourLeague
              </div>
              <p className="text-gray-400">
                &copy; 2024 YourLeague. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-8">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                About
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
