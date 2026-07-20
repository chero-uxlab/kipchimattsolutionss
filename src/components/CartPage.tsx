import React, { useState, useEffect } from 'react';
import { 
  X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Lock, CreditCard, 
  Receipt, FileText, CheckCircle, Award, Printer, Mic, Compass, 
  MapPin, Check, Star, ShieldCheck, ArrowLeft, Truck, HelpCircle,
  Clock, AlertCircle, ShoppingCart
} from 'lucide-react';
import { CartItem, StoreSettings, Customer, Order } from '../types';
import { formatMoney } from '../data/catalog';

interface CartPageProps {
  cart: CartItem[];
  settings: StoreSettings;
  onQtyChange: (id: number, delta: number) => void;
  onRemoveItem: (id: number) => void;
  deliveryLocation: string;
  onDeliveryLocationChange: (county: string) => void;
  onPlaceOrder: (customer: Customer, paymentMethod: string, notes?: string) => Order | null;
  onBackToShop: () => void;
  orders: Order[];
}

export default function CartPage({
  cart,
  settings,
  onQtyChange,
  onRemoveItem,
  deliveryLocation,
  onDeliveryLocationChange,
  onPlaceOrder,
  onBackToShop,
  orders
}: CartPageProps) {
  
  // --- Form & Payment States ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState(deliveryLocation);
  const [payment, setPayment] = useState('mpesa');
  const [notes, setNotes] = useState('');

  // --- Voice Assistant States ---
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'success' | 'error'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // --- GPS Map Grid States ---
  const [pinX, setPinX] = useState(3);
  const [pinY, setPinY] = useState(2);

  // --- Post-Checkout / Success States ---
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [showFeedbackBox, setShowFeedbackBox] = useState<boolean>(true);
  const [ratingError, setRatingError] = useState<boolean>(false);

  // Auto pre-fill customer details from localStorage if they enter a phone number in database
  useEffect(() => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length >= 7) {
      const customersJson = localStorage.getItem('kipchimatt_customers');
      if (customersJson) {
        const customers: Record<string, Customer> = JSON.parse(customersJson);
        const match = customers[cleanPhone.toLowerCase()];
        if (match) {
          setName(match.name);
          setEmail(match.email || '');
          setAddress(match.address);
          setCity(match.city);
          setCounty(match.county);
        }
      }
    }
  }, [phone]);

  // Synchronize county changes with storefront delivery location state
  useEffect(() => {
    if (county) {
      onDeliveryLocationChange(county);
    }
  }, [county]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal >= settings.freeDeliveryThreshold || subtotal === 0 ? 0 : settings.deliveryFee;
  const total = subtotal + deliveryFee;

  // Real Speech Recognition handler
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('error');
      setVoiceTranscript("Speech Recognition is not supported by your browser's current environment.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-US';
      rec.interimResults = false;

      setVoiceStatus('listening');
      setVoiceTranscript("Listening... say 'Place Order' or 'Confirm Purchase'.");

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript.toLowerCase();
        setVoiceTranscript(`Received: "${text}"`);
        if (text.includes('place') || text.includes('confirm') || text.includes('finalize') || text.includes('buy') || text.includes('finish') || text.includes('purchase')) {
          setVoiceStatus('success');
          setVoiceTranscript("Voice command matched! Placing your order...");
          setTimeout(() => {
            handleSubmit();
          }, 1500);
        } else {
          setVoiceStatus('idle');
        }
      };

      rec.onerror = () => {
        setVoiceStatus('error');
        setVoiceTranscript("Microphone request denied. Try our Simulated Voice Command shortcuts below!");
      };

      rec.start();
    } catch (e) {
      setVoiceStatus('error');
      setVoiceTranscript("Failed to start voice listener.");
    }
  };

  // Simulated Voice Command Shortcuts
  const triggerSimulatedCommand = (command: 'place_order' | 'fill_mock' | 'clear') => {
    setVoiceActive(true);
    setVoiceStatus('listening');
    setVoiceTranscript("Simulating voice command...");

    setTimeout(() => {
      if (command === 'place_order') {
        setVoiceTranscript(`Spoken voice command detected: "Place Order Now"`);
        setVoiceStatus('success');
        setTimeout(() => {
          handleSubmit();
        }, 1200);
      } else if (command === 'fill_mock') {
        setVoiceTranscript(`Spoken voice command detected: "Fill demo details"`);
        setVoiceStatus('success');
        setName("Mary Nyambura");
        setPhone("0722334455");
        setEmail("mary.nyambura@gmail.com");
        setAddress("Suite 12C, Westside Heights, Kilimani");
        setCity("Nairobi");
        setCounty("Nairobi");
        setNotes("Rider can leave at reception desk.");
        setPinX(4);
        setPinY(1);
        setTimeout(() => {
          setVoiceStatus('idle');
          setVoiceTranscript("Demo delivery profile loaded via voice assistant!");
        }, 1200);
      } else if (command === 'clear') {
        setVoiceTranscript(`Spoken voice command detected: "Clear form fields"`);
        setVoiceStatus('success');
        setName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setCity("");
        setNotes("");
        setTimeout(() => {
          setVoiceStatus('idle');
          setVoiceTranscript("Form fields cleared.");
        }, 1200);
      }
    }, 1000);
  };

  const getDeliveryEstimate = (countyName: string) => {
    if (!countyName) return { window: 'N/A', clockRange: 'N/A', trafficText: 'N/A' };
    
    let minMinutes = 30;
    let maxMinutes = 45;
    
    switch(countyName.toLowerCase()) {
      case 'nairobi':
        minMinutes = 30;
        maxMinutes = 45;
        break;
      case 'kiambu':
        minMinutes = 45;
        maxMinutes = 60;
        break;
      case 'kajiado':
        minMinutes = 60;
        maxMinutes = 90;
        break;
      case 'machakos':
        minMinutes = 75;
        maxMinutes = 110;
        break;
      case 'nakuru':
        minMinutes = 120;
        maxMinutes = 180;
        break;
      case 'kisumu':
      case 'mombasa':
        minMinutes = 180;
        maxMinutes = 240;
        break;
      default:
        minMinutes = 60;
        maxMinutes = 120;
    }
    
    const currentHour = new Date().getHours();
    let trafficText = 'Smooth rider paths';
    if (currentHour >= 7 && currentHour <= 9) {
      minMinutes += 15;
      maxMinutes += 25;
      trafficText = 'Peak morning rush hour commute';
    } else if (currentHour >= 16 && currentHour <= 19) {
      minMinutes += 20;
      maxMinutes += 30;
      trafficText = 'Evening traffic gridlock delays';
    }

    const now = new Date();
    const startTime = new Date(now.getTime() + minMinutes * 60 * 1000);
    const endTime = new Date(now.getTime() + maxMinutes * 60 * 1000);
    
    const formatClock = (d: Date) => {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return {
      window: `${minMinutes}-${maxMinutes} mins`,
      clockRange: `${formatClock(startTime)} - ${formatClock(endTime)}`,
      trafficText
    };
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !county) {
      return;
    }

    const customerData: Customer = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      county: county
    };

    const finalNotes = `${notes.trim()} (GPS Position: Lon 36.8${(pinX + 1) * 2}°, Lat -1.2${(pinY + 1) * 2}°)`.trim();

    const orderObj = onPlaceOrder(customerData, payment, finalNotes);
    if (orderObj) {
      setPlacedOrder(orderObj);
    }
  };

  const handlePrint = () => {
    if (!placedOrder) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const earnedPoints = Math.floor(placedOrder.subtotal / 100);
    const itemsHtml = placedOrder.items.map(item => `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ddd;">${item.name} x${item.qty}</td>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ddd; text-align: right;">Ksh ${item.price * item.qty}</td>
      </tr>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Kipchimatt Supermarket Receipt #${placedOrder.id.slice(-6).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            body {
              font-family: 'Courier Prime', 'Courier', monospace;
              max-width: 320px;
              margin: 0 auto;
              padding: 10px;
              color: #000;
              font-size: 13px;
              line-height: 1.35;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              margin: 0 0 4px 0;
              text-transform: uppercase;
            }
            .subtitle {
              font-size: 10px;
              margin: 2px 0;
              color: #444;
            }
            .info-table, .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            .info-table td {
              padding: 2px 0;
              font-size: 11px;
            }
            .items-table th {
              border-bottom: 1px solid #000;
              padding: 4px 0;
              text-align: left;
              font-size: 11px;
            }
            .totals {
              border-top: 2px dashed #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              padding: 2px 0;
            }
            .grand-total {
              font-size: 14px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 4px;
              margin-top: 4px;
            }
            .loyalty-box {
              border: 1px dashed #000;
              padding: 8px;
              text-align: center;
              margin: 15px 0;
              font-size: 11px;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              margin-top: 20px;
              color: #555;
            }
            @media print {
              body { margin: 0; padding: 5px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="title">${settings.storeName}</p>
            <p class="subtitle">Phone: ${settings.storePhone} | Email: ${settings.storeEmail}</p>
            <p class="subtitle">Date: ${new Date(placedOrder.date).toLocaleString('en-KE')}</p>
          </div>

          <table class="info-table">
            <tr>
              <td><strong>Order ID:</strong></td>
              <td style="text-align: right;">#${placedOrder.id.slice(-6).toUpperCase()}</td>
            </tr>
            <tr>
              <td><strong>Customer:</strong></td>
              <td style="text-align: right;">${placedOrder.customer.name}</td>
            </tr>
            <tr>
              <td><strong>Phone:</strong></td>
              <td style="text-align: right;">${placedOrder.customer.phone}</td>
            </tr>
            <tr>
              <td><strong>Delivery:</strong></td>
              <td style="text-align: right;">${placedOrder.customer.address}, ${placedOrder.customer.city}</td>
            </tr>
            <tr>
              <td><strong>Payment:</strong></td>
              <td style="text-align: right; text-transform: uppercase;">${placedOrder.payment}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="border-bottom: 2px dashed #000; font-weight: bold;">Description</th>
                <th style="border-bottom: 2px dashed #000; text-align: right; font-weight: bold;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Ksh ${placedOrder.subtotal.toLocaleString('en-KE')}</span>
            </div>
            <div class="total-row">
              <span>Delivery Fee:</span>
              <span>${placedOrder.deliveryFee === 0 ? 'FREE' : 'Ksh ' + placedOrder.deliveryFee.toLocaleString('en-KE')}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL DUE:</span>
              <span>Ksh ${placedOrder.total.toLocaleString('en-KE')}</span>
            </div>
          </div>

          <div class="loyalty-box">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">Kipchimatt Loyalty Club</p>
            <p style="margin: 4px 0 0 0;">Points Gained: +${earnedPoints}</p>
            <p style="margin: 2px 0 0 0; font-weight: bold;">Balance: ${placedOrder.customer.points || 0} pts</p>
          </div>

          <div class="footer">
            <p>Thank you for shopping at Kipchimatt!</p>
            <p>Your local fresh food supermarket partner.</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `;

    try {
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(content);
        doc.close();
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 15000);
      }
    } catch (err) {
      console.error('Print iframe error:', err);
    }
  };

  // --- RENDERING ORDER PLACED SUCCESSFULLY ---
  if (placedOrder) {
    const earnedPoints = Math.floor(placedOrder.subtotal / 100);
    return (
      <div className="flex-1 w-full bg-slate-50 flex flex-col justify-between min-h-[92vh] animate-fade-in font-sans">
        
        {/* SECURED CHECKOUT HEADER */}
        <header className="bg-plum text-white py-4 px-6 shadow-md border-b border-plum-dark flex justify-between items-center w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white text-plum flex items-center justify-center font-black text-sm shadow">
              KP
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide">Kipchimatt Secure Payment Portal</h1>
              <span className="text-[10px] text-white/70 block font-medium uppercase tracking-widest">Order Completed Successfully</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/90 bg-white/10 px-3 py-1.5 rounded-full font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SSL Certified 256-bit Connection</span>
          </div>
        </header>

        {/* FEEDBACK BOX & ORDER BRIEF CARD */}
        <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1 flex flex-col items-center">
          
          {showFeedbackBox && (
            <div className="w-full bg-white rounded-3xl shadow-xl border border-gray-150 p-6 flex flex-col items-center text-center space-y-4 mb-6 relative overflow-hidden border-r-4 border-r-plum">
              <div className="w-10 h-10 rounded-full bg-plum/5 text-plum flex items-center justify-center shadow-inner">
                <Star className="w-5 h-5 fill-plum text-plum animate-bounce" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-plum">How was your overall shopping experience today?</h3>
                <p className="text-xs text-gray-400 font-bold max-w-md mx-auto">
                  Help us serve Kenyan households better by rating our quick delivery process and checkout application.
                </p>
              </div>

              {!feedbackSubmitted ? (
                <div className="w-full max-w-sm flex flex-col items-center gap-2">
                  <div className="flex gap-2.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoverRating || rating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setRating(star);
                            setRatingError(false);
                          }}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 cursor-pointer hover:scale-125 transition-transform"
                        >
                          <Star 
                            className={`w-7 h-7 transition-colors ${
                              active 
                                ? 'fill-plum text-plum' 
                                : 'text-gray-300'
                            }`} 
                          />
                        </button>
                      );
                    })}
                  </div>
                  {ratingError && (
                    <p className="text-[10px] text-red font-black animate-pulse">
                      ⚠️ Please select a rating to submit your comments!
                    </p>
                  )}

                  {rating > 0 && (
                    <span className="text-[10px] font-black text-plum bg-plum/5 px-3 py-1 rounded-full uppercase tracking-wider">
                      {rating === 1 && '😢 Poor / Unhappy'}
                      {rating === 2 && '😕 Below Average'}
                      {rating === 3 && '😐 Average / Okay'}
                      {rating === 4 && '🙂 Good / Satisfied'}
                      {rating === 5 && '😍 Exceptional Service!'}
                    </span>
                  )}

                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Provide additional details regarding payment process or catalogue..."
                    rows={2}
                    className="w-full mt-2 p-3 text-xs bg-gray-50 border border-gray-250 rounded-xl focus:ring-1 focus:ring-plum focus:outline-none font-semibold resize-none"
                  />

                  <div className="flex gap-2.5 w-full mt-1.5">
                    <button
                      onClick={() => setShowFeedbackBox(false)}
                      className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 font-extrabold text-xs py-2 rounded-full cursor-pointer transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => {
                        if (rating === 0) {
                          setRatingError(true);
                          return;
                        }
                        setFeedbackSubmitted(true);
                        setTimeout(() => setShowFeedbackBox(false), 2000);
                      }}
                      className="flex-1 bg-plum hover:bg-plum-dark text-white font-extrabold text-xs py-2 rounded-full shadow cursor-pointer transition-colors"
                    >
                      Send Review
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <h4 className="text-xs font-black text-emerald-600">Review Submitted! Asante sana.</h4>
                </div>
              )}
            </div>
          )}

          {/* MASTER RECEIPT SUMMARY PANEL */}
          <div className="w-full bg-white rounded-3xl shadow-xl border border-gray-150 p-6 flex flex-col items-center text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner animate-pulse">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-plum">Kipchimatt Supermarket Purchase Order</h2>
              <p className="text-xs text-gray-500 font-semibold">Your secure delivery is currently being processed by our Westlands hub dispatcher.</p>
              <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-[10px] font-mono font-black text-slate-700 uppercase tracking-wider mt-2">
                Reference ID: #{placedOrder.id.slice(-6).toUpperCase()}
              </div>
            </div>

            {/* LOYALTY CARD HIGHLIGHT */}
            <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Award className="w-6 h-6 fill-current animate-pulse" />
                </div>
                <div className="text-left text-xs">
                  <span className="text-[9px] bg-amber-600 text-white font-black uppercase px-2 py-0.5 rounded-full tracking-wider inline-block mb-0.5">
                    Loyalty Card Balance
                  </span>
                  <p className="font-extrabold text-gray-800">+{earnedPoints} Points gained on this order!</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Account Total</span>
                <span className="text-sm font-black text-plum">{placedOrder.customer.points || 0} pts</span>
              </div>
            </div>

            {/* EXPANDED BILLING DISPATCH BRIEF */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-xs font-semibold text-gray-600">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-2.5">
                <h4 className="font-black text-gray-800 uppercase tracking-wider text-[10px] border-b pb-1">Delivery Information</h4>
                <div className="space-y-1.5">
                  <p><span className="text-gray-400">Recipient:</span> <span className="text-gray-800 font-extrabold">{placedOrder.customer.name}</span></p>
                  <p><span className="text-gray-400">Mobile Phone:</span> <span className="text-gray-800 font-extrabold">{placedOrder.customer.phone}</span></p>
                  <p><span className="text-gray-400">Physical Location:</span> <span className="text-gray-800 font-extrabold">{placedOrder.customer.address}, {placedOrder.customer.city} ({placedOrder.customer.county} County)</span></p>
                  <p><span className="text-gray-400">Instructions:</span> <span className="text-gray-700 italic font-medium">"{placedOrder.notes || 'None provided'}"</span></p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-2.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-gray-800 uppercase tracking-wider text-[10px] border-b pb-1">Payment & Charges</h4>
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Basket Subtotal:</span>
                      <span className="text-gray-800 font-extrabold">{formatMoney(placedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Supermarket Delivery:</span>
                      <span className="text-gray-800 font-extrabold">{placedOrder.deliveryFee === 0 ? 'FREE' : formatMoney(placedOrder.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 font-bold">
                      <span className="text-plum uppercase tracking-wider text-[10px]">Total Paid:</span>
                      <span className="text-plum font-black text-sm">{formatMoney(placedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2 mt-2">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-[10px]">
                    <span className="font-black uppercase tracking-wider block">Estimated Dispatch</span>
                    <span>Arriving within {getDeliveryEstimate(placedOrder.customer.county).window}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER BAR */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              <button
                onClick={handlePrint}
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4 text-plum" />
                <span>Print Physical Receipt</span>
              </button>
              <button
                onClick={onBackToShop}
                className="flex-1 bg-plum hover:bg-plum-dark text-white font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Return to Store Front</span>
              </button>
            </div>
          </div>
        </main>

        {/* SECURED CHECKOUT FOOTER */}
        <footer className="bg-plum text-white/60 py-6 px-4 text-center text-[10px] font-bold border-t border-plum-dark shadow-inner">
          <p className="max-w-md mx-auto leading-relaxed">
            &copy; {new Date().getFullYear()} Kipchimatt Supermarket Secured Checkout Protocol. All banking details and transactions are protected under secure cryptographic tokens.
          </p>
        </footer>

      </div>
    );
  }

  // --- RENDERING SECURE CART & CHECKOUT PAGE VIEW ---
  return (
    <div className="flex-1 w-full bg-slate-50 flex flex-col justify-between min-h-[92vh] animate-fade-in font-sans">
      
      {/* 1. SECURED CHECKOUT HEADER */}
      <header className="bg-plum text-white py-4 px-6 shadow-md border-b border-plum-dark flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToShop}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer mr-1"
            title="Return to shopping"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white text-plum flex items-center justify-center font-black text-sm shadow">
              KP
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide">Kipchimatt Secured Settlement & Payment Center</h1>
              <span className="text-[10px] text-white/70 block font-medium uppercase tracking-widest">Digital Basket Checkout</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/90 bg-white/10 px-3 py-1.5 rounded-full font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>SSL Secured Connection</span>
        </div>
      </header>

      {/* 2. DUAL-PANE PRIMARY WORKSPACE (NO MARGINS AT THE SCREEN EDGES) */}
      <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-8">
        
        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-150 p-16 text-center shadow-lg max-w-xl mx-auto my-12">
            <ShoppingBag className="w-20 h-20 text-plum mx-auto opacity-20 mb-6" />
            <h2 className="text-xl font-black text-gray-800 mb-2">Your Shopping Basket is Empty</h2>
            <p className="text-xs text-gray-400 font-semibold leading-relaxed max-w-sm mx-auto mb-8">
              You haven't added any products to your cart yet. Visit our supermarket storefront categories to view discounted fresh foods, beverage packs, and baby care essentials.
            </p>
            <button 
              onClick={onBackToShop}
              className="bg-plum hover:bg-plum-dark text-white font-extrabold text-xs px-8 py-3.5 rounded-xl inline-flex items-center gap-2 shadow-md cursor-pointer transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Browse Catalog Deals</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: BASKET REVIEW & SHIPPING DETAILS (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* SECTION A: SHOPPING BASKET ITEMS */}
              <section className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-plum" />
                    <span>Step 1: Review Shopping Items ({cart.reduce((s, i) => s + i.qty, 0)})</span>
                  </h3>
                  <button 
                    onClick={onBackToShop}
                    className="text-plum font-extrabold text-xs hover:underline cursor-pointer"
                  >
                    + Add More Products
                  </button>
                </div>

                {/* FREE DELIVERY PROGRESS BAR */}
                <div className="bg-plum/5 border border-plum/10 rounded-2xl p-4 mb-4 text-xs font-semibold">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Free Rider Delivery threshold:</span>
                    <span className="font-extrabold text-plum">{formatMoney(settings.freeDeliveryThreshold)}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                    <div 
                      className="bg-plum h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (subtotal / settings.freeDeliveryThreshold) * 100)}%` }}
                    />
                  </div>

                  {subtotal >= settings.freeDeliveryThreshold ? (
                    <p className="text-emerald-600 font-extrabold flex items-center gap-1.5 text-[11px] uppercase">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Congratulations! You qualify for FREE supermarket rider delivery!</span>
                    </p>
                  ) : (
                    <p className="text-plum font-bold text-[11px]">
                      Add <span className="font-black underline">{formatMoney(settings.freeDeliveryThreshold - subtotal)}</span> more to bypass the rider shipping fee of {formatMoney(settings.deliveryFee)}!
                    </p>
                  )}
                </div>

                {/* BASKET ITEM LIST */}
                <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div 
                      key={item.id}
                      className="flex gap-4 p-3 border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors bg-gray-50/30"
                    >
                      <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-150">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Kipchimatt';
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex justify-between gap-2">
                          <h4 className="font-black text-gray-800 text-xs sm:text-sm truncate">
                            {item.name}
                          </h4>
                          <span className="font-extrabold text-xs text-plum whitespace-nowrap">
                            {formatMoney(item.price * item.qty)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          {/* Quantity selector buttons */}
                          <div className="flex items-center gap-2.5 bg-white border border-gray-150 rounded-lg p-0.5">
                            <button 
                              onClick={() => onQtyChange(item.id, -1)}
                              className="w-5.5 h-5.5 rounded bg-gray-50 border border-gray-100 hover:bg-plum hover:text-white text-gray-600 flex items-center justify-center cursor-pointer transition-colors text-xs"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-xs font-extrabold text-gray-800 w-4 text-center">
                              {item.qty}
                            </span>
                            <button 
                              onClick={() => onQtyChange(item.id, 1)}
                              className="w-5.5 h-5.5 rounded bg-gray-50 border border-gray-100 hover:bg-plum hover:text-white text-gray-600 flex items-center justify-center cursor-pointer transition-colors text-xs"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <button 
                            onClick={() => onRemoveItem(item.id)}
                            className="text-red hover:text-red-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION B: SHIPPING & DELIVERY DETAILS */}
              <section className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-5">
                <h3 className="font-extrabold text-gray-800 text-sm border-b border-gray-100 pb-3 mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-plum" />
                  <span>Step 2: Recipient Information & Address</span>
                </h3>

                {/* VOICE COMMAND PANEL */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-plum/10 text-plum rounded-xl">
                        <Mic className={`w-4 h-4 ${voiceStatus === 'listening' ? 'animate-pulse text-red-500' : ''}`} />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-gray-850 text-xs">Voice Checkout Companion</h5>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Simulated speech actions</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !voiceActive;
                        setVoiceActive(nextVal);
                        if (nextVal) startSpeechRecognition();
                        else {
                          setVoiceStatus('idle');
                          setVoiceTranscript('');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg font-extrabold text-[10px] uppercase transition-all tracking-wide cursor-pointer border ${
                        voiceActive 
                          ? 'bg-plum text-white border-transparent' 
                          : 'bg-white hover:bg-gray-50 text-plum border-gray-200'
                      }`}
                    >
                      {voiceActive ? 'Hide Assistant' : 'Show Voice Assistant'}
                    </button>
                  </div>

                  {voiceActive && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-150">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400">Recording Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                          voiceStatus === 'listening' ? 'bg-red-50 text-red-600 animate-pulse' :
                          voiceStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
                          voiceStatus === 'error' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {voiceStatus}
                        </span>
                      </div>

                      {voiceTranscript && (
                        <p className="p-2 bg-amber-50/40 border border-amber-200/40 rounded-lg text-amber-900 font-mono text-[10px] leading-relaxed">
                          {voiceTranscript}
                        </p>
                      )}

                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block mb-1">Interactive Spoken Command Shortcuts</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => triggerSimulatedCommand('fill_mock')}
                            className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-black text-[10px] px-2.5 py-1 rounded border border-sky-100 cursor-pointer"
                          >
                            🗣️ "Fill demo details"
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerSimulatedCommand('place_order')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] px-2.5 py-1 rounded border border-emerald-100 cursor-pointer"
                          >
                            🗣️ "Confirm purchase now"
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerSimulatedCommand('clear')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] px-2.5 py-1 rounded border border-rose-100 cursor-pointer"
                          >
                            🗣️ "Clear form fields"
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* FORM FIELDS */}
                <div className="space-y-4 text-xs font-semibold text-gray-700">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g., Jane Wanjiku"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-350 outline-none focus:border-plum font-medium transition-colors bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Phone Number *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="07XX XXX XXX (for M-Pesa)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-350 outline-none focus:border-plum font-medium transition-colors bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Email Address (Optional)</label>
                      <input 
                        type="email" 
                        placeholder="jane.wanjiku@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-350 outline-none focus:border-plum font-medium transition-colors bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Physical Delivery Address *</label>
                    <textarea 
                      rows={2}
                      required 
                      placeholder="Apartment/Villa Name, House No., Street, Landmark Cue"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-355 outline-none focus:border-plum font-medium transition-colors bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">City / Town *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g., Nairobi"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-350 outline-none focus:border-plum font-medium transition-colors bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">County *</label>
                      <select 
                        required
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-350 outline-none focus:border-plum bg-white transition-colors"
                      >
                        <option value="">Select County</option>
                        <option value="Nairobi">Nairobi</option>
                        <option value="Kiambu">Kiambu</option>
                        <option value="Kajiado">Kajiado</option>
                        <option value="Machakos">Machakos</option>
                        <option value="Mombasa">Mombasa</option>
                        <option value="Nakuru">Nakuru</option>
                        <option value="Kisumu">Kisumu</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Special Instructions & Landmark Directions</label>
                    <textarea 
                      rows={2}
                      placeholder="e.g., near Safaricom mast, knock on green gate, packaging request..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-350 outline-none focus:border-plum font-medium transition-colors bg-white"
                    />
                  </div>

                  {/* INTERACTIVE GPS MAP GRID */}
                  <div className="space-y-2 border border-slate-100 p-4 rounded-2xl bg-slate-50">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-plum" />
                      <span>Precision GPS Drop-off Map</span>
                    </label>
                    <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                      Click a grid coordinate block below to map your drop-off point for direct rider dispatch.
                    </p>
                    
                    <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-3">
                      <div className="grid grid-cols-8 gap-1.5 aspect-video w-full bg-slate-950 rounded-xl p-3 relative overflow-hidden">
                        {Array.from({ length: 5 }).map((_, r) => (
                          Array.from({ length: 8 }).map((_, c) => {
                            const isSelected = pinX === c && pinY === r;
                            return (
                              <button
                                key={`${r}-${c}`}
                                type="button"
                                onClick={() => {
                                  setPinX(c);
                                  setPinY(r);
                                }}
                                className={`aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer relative hover:scale-110 border ${
                                  isSelected 
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25 z-10' 
                                    : 'bg-slate-800/30 hover:bg-slate-700/50 border-slate-700/10'
                                }`}
                                title={`Lon: 36.8${(c + 1) * 2}°, Lat: -1.2${(r + 1) * 2}°`}
                              >
                                {isSelected && (
                                  <span className="absolute w-2 h-2 rounded-full bg-white animate-ping" />
                                )}
                                <span className="text-[8px] scale-75 text-slate-500 pointer-events-none select-none font-mono">
                                  {isSelected ? '🎯' : `${c + 1},${r + 1}`}
                                </span>
                              </button>
                            );
                          })
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800/60">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Coordinate Dropped
                        </span>
                        <span>
                          Lon: 36.8{(pinX + 1) * 2}°, Lat: -1.2{(pinY + 1) * 2}°
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: SECURED SETTLEMENT & SUMMARY BILLING (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* SECTION C: SECURE PAYMENT MODE SELECTION */}
              <section className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-gray-800 text-sm border-b border-gray-100 pb-3 mb-1 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-plum" />
                  <span>Step 3: Secured Payment Gateway</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <p className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Select Payment Channel</p>
                  
                  {/* MPESA BUTTON */}
                  <label className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${payment === 'mpesa' ? 'border-plum bg-plum/5 ring-1 ring-plum/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="payment_choice"
                        checked={payment === 'mpesa'}
                        onChange={() => setPayment('mpesa')}
                        className="text-plum focus:ring-plum w-4 h-4 cursor-pointer"
                      />
                      <div className="text-left">
                        <span className="font-extrabold text-gray-800 block">Safaricom M-Pesa</span>
                        <span className="text-[10px] text-gray-400 font-bold block">Automatic payment request on delivery</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Popular</span>
                  </label>

                  {/* CARD BUTTON */}
                  <label className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${payment === 'card' ? 'border-plum bg-plum/5 ring-1 ring-plum/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="payment_choice"
                        checked={payment === 'card'}
                        onChange={() => setPayment('card')}
                        className="text-plum focus:ring-plum w-4 h-4 cursor-pointer"
                      />
                      <div className="text-left">
                        <span className="font-extrabold text-gray-800 block">Credit or Debit Card</span>
                        <span className="text-[10px] text-gray-400 font-bold block">Visa, Mastercard, AMEX, UnionPay</span>
                      </div>
                    </div>
                  </label>

                  {/* CASH BUTTON */}
                  <label className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${payment === 'cash' ? 'border-plum bg-plum/5 ring-1 ring-plum/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="payment_choice"
                        checked={payment === 'cash'}
                        onChange={() => setPayment('cash')}
                        className="text-plum focus:ring-plum w-4 h-4 cursor-pointer"
                      />
                      <div className="text-left">
                        <span className="font-extrabold text-gray-800 block">Cash on Delivery (COD)</span>
                        <span className="text-[10px] text-gray-400 font-bold block">Pay cash directly to our rider on arrival</span>
                      </div>
                    </div>
                  </label>
                </div>

                {payment === 'card' && (
                  <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3.5 text-xs animate-scale-up">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                      <input type="text" placeholder="e.g. Jane Wanjiku" className="w-full p-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-plum" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Credit Card Number</label>
                      <input type="text" placeholder="XXXX - XXXX - XXXX - XXXX" className="w-full p-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-plum" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Expiry Date</label>
                        <input type="text" placeholder="MM / YY" className="w-full p-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-plum" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">CVV Security Code</label>
                        <input type="password" placeholder="***" maxLength={3} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-plum" />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION D: BILLING SETTLEMENT SUMMARY */}
              <section className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-5">
                <h3 className="font-extrabold text-gray-800 text-sm border-b border-gray-100 pb-3 mb-1 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-plum" />
                  <span>Settlement Breakdown</span>
                </h3>

                <div className="space-y-3.5 text-xs font-semibold text-gray-500">
                  <div className="flex justify-between">
                    <span>Basket Subtotal</span>
                    <span className="text-gray-800 font-extrabold">{formatMoney(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Supermarket Dispatch Rider Fee</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 font-black bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider text-[9px]">
                          FREE
                        </span>
                      ) : (
                        <span className="text-gray-800 font-extrabold">{formatMoney(deliveryFee)}</span>
                      )}
                    </span>
                  </div>

                  <div className="border-t border-gray-250 pt-4 flex justify-between items-center text-gray-800 font-bold">
                    <span className="text-sm font-black text-plum">Grand Total Due:</span>
                    <span className="text-xl font-black text-plum">{formatMoney(total)}</span>
                  </div>
                </div>

                {/* DYNAMIC ESTIMATED ARRIVAL BAR */}
                {county && (
                  <div className="bg-plum/5 border border-plum/15 p-3.5 rounded-2xl text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-plum font-black text-[10px] uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Rider Shipment Dispatch ETA</span>
                    </div>
                    <p className="text-xs text-gray-800 font-black">
                      Delivery arriving in <span className="text-emerald-600 underline font-black">{getDeliveryEstimate(county).window}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 font-semibold leading-normal">
                      Estimated Delivery Slot: <strong className="text-gray-700">{getDeliveryEstimate(county).clockRange}</strong>
                    </p>
                    <p className="text-[9px] text-gray-400 italic font-medium mt-0.5">
                      ({getDeliveryEstimate(county).trafficText} to {county} County)
                    </p>
                  </div>
                )}

                {/* MASTER SUBMISSION BUTTON */}
                <button 
                  onClick={() => handleSubmit()}
                  disabled={!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !county}
                  className={`w-full py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow uppercase tracking-wider ${
                    (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !county)
                      ? 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-plum hover:bg-plum-dark text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Securely Authorize & Place Order ({formatMoney(total)})</span>
                </button>

                {(!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !county) && (
                  <p className="text-[10px] text-amber-600 font-extrabold text-center animate-pulse">
                    ⚠️ Complete recipient details in Step 2 to authorize payment!
                  </p>
                )}
              </section>

            </div>

          </div>
        )}

      </main>

      {/* 3. SECURED CHECKOUT FOOTER */}
      <footer className="bg-plum text-white/60 py-8 px-4 text-center text-[10px] font-bold border-t border-plum-dark w-full shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="max-w-md text-left leading-relaxed">
            &copy; {new Date().getFullYear()} Kipchimatt Secure Checkout Protocol. Secured using 256-bit Advanced Encryption Standards (AES). All orders are directly fulfilled by registered storefront dispatch riders.
          </p>
          <div className="flex items-center gap-3">
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white/85 font-bold flex items-center gap-1 text-[11px]">
              <Lock className="w-3 h-3 text-emerald-300" />
              <span>PCI-DSS Compliant</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
