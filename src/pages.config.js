/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDashboard from './pages/AdminDashboard';
import CallRequests from './pages/CallRequests';
import CareerGames from './pages/CareerGames';
import EventsPage from './pages/EventsPage';
import Home from './pages/Home';
import IntegrationsHub from './pages/IntegrationsHub';
import JobManagement from './pages/JobManagement';
import JobSwipe from './pages/JobSwipe';
import Messages from './pages/Messages';
import Onboarding from './pages/Onboarding';
import Projects from './pages/Projects';
import RecruiterDashboard from './pages/RecruiterDashboard';
import RecruiterProfilePage from './pages/RecruiterProfilePage';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentSearch from './pages/StudentSearch';
import StudentSwipe from './pages/StudentSwipe';
import InterviewScheduling from './pages/InterviewScheduling';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "CallRequests": CallRequests,
    "CareerGames": CareerGames,
    "EventsPage": EventsPage,
    "Home": Home,
    "IntegrationsHub": IntegrationsHub,
    "JobManagement": JobManagement,
    "JobSwipe": JobSwipe,
    "Messages": Messages,
    "Onboarding": Onboarding,
    "Projects": Projects,
    "RecruiterDashboard": RecruiterDashboard,
    "RecruiterProfilePage": RecruiterProfilePage,
    "StudentDashboard": StudentDashboard,
    "StudentProfilePage": StudentProfilePage,
    "StudentSearch": StudentSearch,
    "StudentSwipe": StudentSwipe,
    "InterviewScheduling": InterviewScheduling,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};