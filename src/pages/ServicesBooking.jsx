import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Calendar, Clock, FileText, Video, ArrowRight, ChevronRight, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import BuyCreditsModal from '../components/subscriptions/BuyCreditsModal';

const SERVICE_CATEGORIES = [
{
  id: 'package1',
  title: 'Package 1',
  description: 'Team call + career documents',
  icon: FileText,
  color: 'from-[#5BA4C4] to-[#3D87AA]',
  services: [
  { id: 'package1_standard', title: 'Package 1 — Call with Team', price: '€99.95', regularPrice: null,
    includes: ['Call with Team (2h)', 'One Pager CV', 'LinkedIn Template', 'Interview Prep Document'] }]
},
{
  id: 'package2',
  title: 'Package 2',
  description: 'CEO call + top recommendations',
  icon: Video,
  color: 'from-[#3D87AA] to-[#2d6d8e]',
  services: [
  { id: 'package2_premium', title: 'Package 2 — Call with CEO', price: '€139.95', regularPrice: null,
    includes: ['Call with CEO', 'One Pager CV', 'LinkedIn Template', 'Interview Prep Document', 'Cover Letter Template'] }]
}];


export default function ServicesBooking() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [gameProgress, setGameProgress] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({ scheduled_date: '', scheduled_time: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [profiles, bookingsData, gameProgressData] = await Promise.all([
    base44.entities.StudentProfile.filter({ created_by: u.email }),
    base44.entities.ServiceBooking.filter({ created_by: u.email }),
    base44.entities.GameProgress.filter({ created_by: u.email })]
    );
    setProfile(profiles[0] || null);
    setBookings(bookingsData);
    setGameProgress(gameProgressData[0] || { credits: 0 });
    setLoading(false);
  };

  const handleBookService = async () => {
    if (!formData.scheduled_date) {
      alert('Please select a date');
      return;
    }

    setSaving(true);
    const category = SERVICE_CATEGORIES.find((c) => c.id === selectedCategory);
    const service = category?.services.find((s) => s.id === selectedService);
    const priceInCredits = parseInt(service?.price.replace('£', '') || 0);

    try {
      await base44.entities.ServiceBooking.create({
        service_type: selectedService,
        credits_spent: priceInCredits,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        notes: formData.notes,
        status: 'scheduled'
      });

      // Deduct credits from game progress
      const newCredits = Math.max(0, gameProgress.credits - priceInCredits);
      await base44.entities.GameProgress.update(gameProgress.id, { credits: newCredits });

      setShowBookingModal(false);
      setSelectedService(null);
      setSelectedCategory(null);
      setFormData({ scheduled_date: '', scheduled_time: '', notes: '' });
      loadData();
    } catch (error) {
      alert('Error booking service');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" /></div>;

  const upcomingBookings = bookings.filter((b) => b.status === 'scheduled').sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const credits = gameProgress?.credits || 0;

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-white">Career Services 🚀</h1>
          <p className="text-white/80 mt-1">Invest in your career growth</p>
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-2xl p-4">
              <p className="text-white text-sm font-semibold">Your Credits: <span className="text-2xl font-black">{credits}</span></p>
            </div>
            <button
              onClick={() => setShowBuyCredits(true)}
              className="flex items-center gap-2 bg-white text-[#3D87AA] font-bold text-sm px-5 py-3 rounded-2xl hover:bg-[#EAF5FB] transition-colors shadow-sm">

              <ShoppingCart className="w-4 h-4" /> Buy Credits (€1 = 1 credit)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 pb-12">
        <Tabs defaultValue="available">
          <TabsList className="bg-white shadow-sm border border-[#E8E4DF] mb-6">
            <TabsTrigger value="available">Available Services</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming {upcomingBookings.length > 0 && <span className="ml-1.5 bg-[#5BA4C4] text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{upcomingBookings.length}</span>}</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {!selectedCategory ?
            <div className="grid md:grid-cols-3 gap-4">
                {SERVICE_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.id} className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                  onClick={() => setSelectedCategory(category.id)}>
                      <div className={`bg-gradient-to-br ${category.color} p-6 text-white`}>
                        <Icon className="w-8 h-8 mb-3" />
                        <h3 className="font-bold text-lg">{category.title}</h3>
                        <p className="text-sm text-white/80 mt-1">{category.description}</p>
                      </div>
                      <CardContent className="bg-slate-200 p-6">
                        <p className="text-sm text-[#7A7870] mb-4">{category.services.length} options available</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#7A7870]">From {category.services[0]?.price}</span>
                          <ChevronRight className="w-4 h-4 text-[#8FAFC4]" />
                        </div>
                      </CardContent>
                    </Card>);

              })}
              </div> :

            <div>
                <button onClick={() => setSelectedCategory(null)} className="mb-6 flex items-center gap-2 text-[#5BA4C4] hover:text-[#3D87AA] font-semibold text-sm">
                  ← Back to Categories
                </button>
                <div className="space-y-3">
                  {SERVICE_CATEGORIES.find((c) => c.id === selectedCategory)?.services.map((service) => {
                  const priceNum = parseFloat(service.price.replace('€', ''));
                  return (
                    <Card key={service.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <h4 className="font-bold text-[#2E3F4F] mb-1">{service.title}</h4>
                              <p className="text-2xl font-black text-[#5BA4C4]">{service.price}</p>
                            </div>
                            <Button
                            onClick={() => { setSelectedService(service.id); setShowBookingModal(true); }}
                            className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] flex-shrink-0">
                              Book Now
                            </Button>
                          </div>
                          {service.includes && (
                            <ul className="space-y-1">
                              {service.includes.map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-[#7A7870]">
                                  <CheckCircle className="w-4 h-4 text-[#5BA4C4] flex-shrink-0" />{item}
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>);

                })}
                </div>
              </div>
            }
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="space-y-4">
              {upcomingBookings.length === 0 ?
              <div className="text-center py-12">
                <p className="text-[#7A7870] mb-4">No upcoming bookings</p>
                  <Link to={createPageUrl('CareerGames')}>
                    <Button className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]">Earn Credits <ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </Link>
                </div> :

              upcomingBookings.map((booking) => {
                const service = SERVICE_CATEGORIES.flatMap((c) => c.services).find((s) => s.id === booking.service_type);
                return (
                  <Card key={booking.id} className="border-[#E8E4DF]">
                      <CardContent className="p-5 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-[#2E3F4F]">{service?.title}</h3>
                            <span className="bg-[#EAF5FB] text-[#3D87AA] text-xs px-2 py-0.5 rounded-full font-semibold border border-[#A8D4E8]">Scheduled</span>
                          </div>
                          <div className="space-y-1 text-sm text-[#7A7870]">
                            <p className="flex items-center gap-2"><Calendar className="w-4 h-4" />{format(new Date(booking.scheduled_date), 'MMM d, yyyy')}</p>
                            {booking.scheduled_time && <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{booking.scheduled_time}</p>}
                          </div>
                          {booking.notes && <p className="text-xs text-[#7A7870] mt-2">{booking.notes}</p>}
                          </div>
                          <div className="text-right">
                          <p className="text-[#7A7870] text-xs mb-1">Credits Spent</p>
                          <p className="text-xl font-black text-[#2E3F4F]">{booking.credits_spent}</p>
                        </div>
                      </CardContent>
                    </Card>);

              })
              }
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {completedBookings.length === 0 ?
              <div className="text-center py-12 text-[#7A7870]">No completed services yet</div> :

              completedBookings.map((booking) => {
                const service = SERVICE_CATEGORIES.flatMap((c) => c.services).find((s) => s.id === booking.service_type);
                return (
                  <Card key={booking.id} className="border-[#E8E4DF]">
                       <CardContent className="p-5 flex items-start justify-between gap-4">
                         <div>
                           <div className="flex items-center gap-2 mb-2">
                             <CheckCircle className="w-5 h-5 text-[#5BA4C4]" />
                             <h3 className="font-bold text-[#2E3F4F]">{service?.title}</h3>
                           </div>
                           <p className="text-sm text-[#7A7870]">{format(new Date(booking.scheduled_date), 'MMM d, yyyy')}</p>
                         </div>
                         <p className="text-sm font-semibold text-[#7A7870]">{booking.credits_spent} credits</p>
                      </CardContent>
                    </Card>);

              })
              }
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BuyCreditsModal
        open={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
        onSuccess={() => {setShowBuyCredits(false);loadData();}} />


      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {SERVICE_CATEGORIES.find((c) => c.id === selectedCategory)?.services.find((s) => s.id === selectedService)?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700">Preferred Date *</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData((p) => ({ ...p, scheduled_date: e.target.value }))}
                className="mt-1.5"
                min={format(new Date(), 'yyyy-MM-dd')} />

            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Preferred Time</Label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData((p) => ({ ...p, scheduled_time: e.target.value }))}
                className="mt-1.5" />

            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Notes or Requirements</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1.5 resize-none"
                rows={3}
                placeholder="Any specific areas you'd like to focus on..." />

            </div>
            <div className="bg-[#EAF5FB] border border-[#A8D4E8] p-4 rounded-xl">
              <p className="text-xs text-[#3D87AA] mb-1 font-semibold">Package Price</p>
              <p className="text-2xl font-black text-[#2E3F4F]">{SERVICE_CATEGORIES.find((c) => c.id === selectedCategory)?.services.find((s) => s.id === selectedService)?.price}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowBookingModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleBookService} disabled={saving} className="flex-1 bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]">
                {saving ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}