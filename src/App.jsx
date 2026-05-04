import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, where, updateDoc } from 'firebase/firestore';

// ==========================================
// 1. 設定與初始化
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC8PjCBiK3j0YKLNQdhj0M6SCpUt3gF7DQ",
  authDomain: "ai-homework-5dcf3.firebaseapp.com",
  projectId: "ai-homework-5dcf3",
  storageBucket: "ai-homework-5dcf3.firebasestorage.app",
  messagingSenderId: "909084261985",
  appId: "1:909084261985:web:61dd8e59e982e6d3577420",
  measurementId: "G-2LF9Y4BHM6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ROOM_INFO = {
  '標準雙人房': { price: 2000, desc: '適合情侶或背包客。附獨立衛浴、免費 Wi-Fi。', imgColor: '#a8d5e2' },
  '豪華四人房': { price: 3800, desc: '家庭旅遊首選。兩張標準雙人床、乾濕分離衛浴。', imgColor: '#f9a826' },
  '家庭包棟': { price: 12000, desc: '獨享整棟空間。含 3 間臥室、KTV 伴唱設備及烤肉區。', imgColor: '#ff7b54' }
};

// ==========================================
// 2. 樣式定義
// ==========================================
const styles = {
  app: { fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  button: { padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0056b3', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  buttonDanger: { backgroundColor: '#dc3545' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px' },
  input: { width: '100%', padding: '10px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' },
  
  // 促銷區塊樣式 (已保留)
  promoBox: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '8px', padding: '15px', marginBottom: '20px' },
  promoTitle: { margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  promoTag: { backgroundColor: '#dc3545', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  
  priceBoard: { backgroundColor: '#f8f9fa', border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginTop: '15px', fontSize: '14px', transition: '0.3s' },
  
  roomGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' },
  roomCard: { border: '2px solid #eee', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: '0.2s' },
  roomCardSelected: { border: '2px solid #0056b3', backgroundColor: '#f0f8ff' },
  roomImg: { height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px' },
  roomContent: { padding: '10px' },
  roomTitle: { margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' },
  roomDesc: { margin: 0, fontSize: '12px', color: '#666', lineHeight: '1.4', height: '50px', overflow: 'hidden' },
  
  chatBox: { height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px', backgroundColor: '#fafafa' },
  bubbleUser: { backgroundColor: '#007bff', color: '#fff', padding: '10px', borderRadius: '15px', margin: '5px 0', alignSelf: 'flex-end', marginLeft: 'auto', width: 'fit-content', maxWidth: '80%' },
  bubbleAi: { backgroundColor: '#e9ecef', color: '#333', padding: '10px', borderRadius: '15px', margin: '5px 0', width: 'fit-content', maxWidth: '80%' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left', fontSize: '14px' },
  td: { borderBottom: '1px solid #ddd', padding: '10px', fontSize: '14px' },
  
  statsGrid: { display: 'flex', gap: '15px', marginBottom: '20px' },
  statCard: { flex: 1, padding: '20px', borderRadius: '12px', color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, fontSize: '24px' }
};

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false); 

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      const acc = prompt("請輸入管理員帳號 (提示: 1234)：");
      const pwd = prompt("請輸入管理員密碼 (提示: 1234)：");
      if (acc === "1234" && pwd === "1234") setIsAdmin(true);
      else alert("帳號或密碼錯誤，請輸入 1234。");
    }
  };

  return (
    <div style={styles.app}>
      {loading && <div style={styles.overlay}>系統處理中...</div>}
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={{ margin: 0, color: '#333' }}>AI 智慧民宿系統</h1>
          <button style={styles.button} onClick={handleAdminToggle}>
            {isAdmin ? '登出後台' : '管理員登入'}
          </button>
        </div>
        {isAdmin ? <AdminDashboard db={db} setLoading={setLoading} /> : <CustomerView db={db} setLoading={setLoading} />}
      </div>
    </div>
  );
}

// ==========================================
// 3. 顧客端介面
// ==========================================
function CustomerView({ db, setLoading }) {
  const [form, setForm] = useState({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '', paymentMethod: '信用卡', promoCode: '' });
  const [roomStatus, setRoomStatus] = useState(null); 
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '您好！我是 AI 客服。想知道房價或隱藏優惠嗎？' }]);
  const [chatInput, setChatInput] = useState('');
  const [paymentStep, setPaymentStep] = useState(false);

  useEffect(() => { setRoomStatus(null); }, [form.dateIn, form.dateOut, form.roomType]);

  const calculatePrice = () => {
    if (!form.dateIn || !form.dateOut) return { nights: 0, base: 0, discount: 0, total: 0, msg: '' };
    const d1 = new Date(form.dateIn);
    const d2 = new Date(form.dateOut);
    const nights = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    
    if (nights <= 0) return { nights: 0, base: 0, discount: 0, total: 0, msg: '' };

    const basePrice = ROOM_INFO[form.roomType].price * nights;
    let discountAmt = 0;
    let discountMsg = '';

    if (form.promoCode === 'SUMMER88') {
      if (form.roomType === '家庭包棟') {
        discountAmt = Math.round(basePrice * 0.12);
        discountMsg = '✅ 已套用暑期 88 折優惠';
      } else {
        discountMsg = '❌ 此優惠碼僅限家庭包棟使用';
      }
    } else if (form.promoCode === 'AI500') {
      discountAmt = 500;
      discountMsg = '✅ 已套用 AI 專屬 500 元折抵';
    } else if (form.promoCode.length > 0) {
      discountMsg = '❌ 無效的優惠代碼';
    }

    let total = basePrice - discountAmt;
    if (total < 0) total = 0;
    return { nights, base: basePrice, discount: discountAmt, total, msg: discountMsg };
  };

  const priceData = calculatePrice();

  const checkAvailability = async () => {
    if (!form.dateIn || !form.dateOut) return alert('請先選擇入住與退房日期');
    if (priceData.nights <= 0) return alert('退房日期必須晚於入住日期');
    setRoomStatus('checking');
    try {
      const q = query(collection(db, "bookings"), 
        where("roomType", "==", form.roomType), 
        where("dateIn", "==", form.dateIn),
        where("status", "in", ["已付款", "已入住"])
      );
      const snapshot = await getDocs(q);
      setRoomStatus(!snapshot.empty ? 'full' : 'available');
    } catch(err) {
      alert("查詢失敗，請檢查網路狀態。");
      setRoomStatus(null);
    }
  };

  const handleBookingInit = async (e) => {
    e.preventDefault();
    if (!form.dateIn || !form.dateOut || !form.name) return alert('資料不完整');
    if (roomStatus !== 'available') return alert('請先點擊「檢查空房」，確認尚有空房後再送出訂單');
    setPaymentStep(true);
  };

  const handleMockPayment = async (isSuccess) => {
    if (!isSuccess) {
      setPaymentStep(false);
      return alert('已取消付款');
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "bookings"), {
        ...form,
        nights: priceData.nights,
        totalPrice: priceData.total,
        status: '已付款', 
        timestamp: new Date().toISOString()
      });
      alert('付款成功！訂單已成立。');
      setForm({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '', paymentMethod: '信用卡', promoCode: '' });
      setPaymentStep(false);
      setRoomStatus(null);
    } catch (error) {
      alert('系統寫入錯誤。');
    }
    setLoading(false);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newHistory);
    const currentInput = chatInput;
    setChatInput(''); 
    setTimeout(() => {
      let aiText = "這部分的問題我還在學習中，如果是急事，請直接聯繫民宿老闆喔！"; 
      if (currentInput.includes("優惠") || currentInput.includes("折扣")) {
        aiText = "現在結帳時輸入隱藏代碼『AI500』，住宿費可以直接折抵 500 元喔！家庭包棟的話可以輸入『SUMMER88』享 88 折！";
      }
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
    }, 1000); 
  };

  return (
    <div>
      {/* 恢復：促銷橫幅區塊 */}
      <div style={styles.promoBox}>
        <h3 style={styles.promoTitle}>🎉 本月限定優惠活動 <span style={styles.promoTag}>HOT</span></h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li><strong>【暑期早鳥專案】</strong>預訂「家庭包棟」，結帳輸入代碼 <code style={{backgroundColor: '#fff', padding: '2px 4px'}}>SUMMER88</code> 享 88 折！</li>
          <li><strong>【AI 客服專屬禮】</strong>跟 AI 客服聊天，或許能問到<strong style={{color: '#dc3545'}}>隱藏版折價券碼</strong>喔！</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ ...styles.card, flex: 1, minWidth: '300px', marginBottom: 0 }}>
          <h3>AI 智慧客服</h3>
          <div style={styles.chatBox}>
            {chatHistory.map((msg, i) => (
              <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}>{msg.text}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input style={styles.input} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="詢問隱藏優惠..." onKeyPress={e => e.key === 'Enter' && sendChatMessage()} />
            <button style={styles.button} onClick={sendChatMessage}>發送</button>
          </div>
        </div>

        <div style={{ ...styles.card, flex: 1, minWidth: '350px', marginBottom: 0 }}>
          <h3>線上訂房與自動計價</h3>
          {!paymentStep ? (
            <form onSubmit={handleBookingInit}>
               <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>入住日期</label>
                   <input type="date" style={styles.input} value={form.dateIn} onChange={e => setForm({...form, dateIn: e.target.value})} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>退房日期</label>
                   <input type="date" style={styles.input} value={form.dateOut} onChange={e => setForm({...form, dateOut: e.target.value})} required />
                 </div>
               </div>

               <div style={styles.roomGrid}>
                 {Object.entries(ROOM_INFO).map(([type, info]) => (
                   <div key={type} style={{ ...styles.roomCard, ...(form.roomType === type ? styles.roomCardSelected : {}) }} onClick={() => setForm({...form, roomType: type})}>
                     <div style={{...styles.roomImg, backgroundColor: info.imgColor}}>{type}</div>
                     <div style={styles.roomContent}>
                       <h4 style={styles.roomTitle}>{type}</h4>
                       <div style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>NT$ {info.price} /晚</div>
                       <p style={styles.roomDesc}>{info.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                 <button type="button" style={{...styles.button, backgroundColor: '#6c757d'}} onClick={checkAvailability}>{roomStatus === 'checking' ? '查詢中...' : '檢查此區間空房'}</button>
                 {roomStatus === 'available' && <span style={{color: '#28a745', fontWeight: 'bold'}}>✅ 尚有空房</span>}
                 {roomStatus === 'full' && <span style={{color: '#dc3545', fontWeight: 'bold'}}>❌ 已客滿</span>}
               </div>

               <label style={{ fontSize: '12px', color: '#666' }}>優惠代碼 (輸入即自動試算)</label>
               <input type="text" placeholder="例: SUMMER88 或 AI500" style={styles.input} value={form.promoCode} onChange={e => setForm({...form, promoCode: e.target.value.toUpperCase()})} />
               {priceData.msg && (
                 <div style={{ fontSize: '12px', color: priceData.msg.includes('✅') ? '#28a745' : '#dc3545', marginTop: '-5px', marginBottom: '10px', fontWeight: 'bold' }}>
                   {priceData.msg}
                 </div>
               )}

               <div style={{...styles.priceBoard, backgroundColor: priceData.discount > 0 ? '#e8f5e9' : '#f8f9fa', borderColor: priceData.discount > 0 ? '#c8e6c9' : '#ddd'}}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                   <span>住宿天數：</span><span>{priceData.nights} 晚</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                   <span>原價小計：</span><span>NT$ {priceData.base.toLocaleString()}</span>
                 </div>
                 {priceData.discount > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745', marginBottom: '5px', fontWeight: 'bold' }}>
                     <span>優惠折抵 ({form.promoCode})：</span><span>- NT$ {priceData.discount.toLocaleString()}</span>
                   </div>
                 )}
                 <hr style={{ border: '0', borderTop: '1px solid #ccc', margin: '10px 0' }} />
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
                   <span>結帳總額：</span><span style={{ color: '#0056b3', fontSize: '18px' }}>NT$ {priceData.total.toLocaleString()}</span>
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                 <div style={{ flex: 1 }}><input type="text" placeholder="訂購人姓名" style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                 <div style={{ flex: 1 }}><input type="text" placeholder="聯絡電話" style={styles.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></div>
               </div>

               <button type="submit" style={{...styles.button, width: '100%', marginTop: '10px', backgroundColor: roomStatus === 'available' ? '#0056b3' : '#ccc'}} disabled={roomStatus !== 'available'}>
                 {roomStatus === 'available' ? '確認金額無誤並前往結帳' : '請先完成空房檢查'}
               </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h4>即將跳轉金流閘道</h4>
              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '15px 0', textAlign: 'left' }}>
                <p>應付總額：<strong style={{color: '#dc3545', fontSize: '18px'}}>NT$ {priceData.total.toLocaleString()}</strong></p>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button style={{...styles.button, backgroundColor: '#28a745'}} onClick={() => handleMockPayment(true)}>模擬付款成功</button>
                <button style={{...styles.button, ...styles.buttonDanger}} onClick={() => handleMockPayment(false)}>取消</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. 進階管理者端介面
// ==========================================
function AdminDashboard({ db, setLoading }) {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, validRevenue: 0 });
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data);
      
      let revenue = 0;
      data.forEach(o => {
        if (o.status !== '已取消') revenue += (o.totalPrice || 0);
      });
      setStats({ totalOrders: data.length, validRevenue: revenue });

    } catch (error) {
      alert("讀取失敗，請確認資料庫連線。");
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateOrderStatus = async (id, newStatus) => {
    if (!window.confirm(`確定將訂單狀態更改為「${newStatus}」？`)) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "bookings", id), { status: newStatus });
      fetchOrders(); 
    } catch (err) {
      alert("狀態更新失敗");
    }
    setLoading(false);
  };

  const deleteOrder = async (id) => {
    if (window.confirm("嚴重警告：確定要徹底刪除此訂單資料？")) {
      setLoading(true);
      await deleteDoc(doc(db, "bookings", id));
      fetchOrders();
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, backgroundColor: '#17a2b8'}}>
          總訂單數<br/><span style={{fontSize: '28px'}}>{stats.totalOrders} 筆</span>
        </div>
        <div style={{...styles.statCard, backgroundColor: '#28a745'}}>
          預估總營收 (排除取消)<br/><span style={{fontSize: '28px'}}>NT$ {stats.validRevenue.toLocaleString()}</span>
        </div>
      </div>

      <div style={styles.card}>
        <h3>後台訂單管理系統</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>成立時間 / 日期區間</th>
                <th style={styles.th}>房型資訊</th>
                <th style={styles.th}>客戶資訊</th>
                <th style={styles.th}>實際收款</th>
                <th style={styles.th}>營運狀態管理</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const isCancelled = o.status === '已取消';
                return (
                  <tr key={o.id} style={{ opacity: isCancelled ? 0.6 : 1, backgroundColor: isCancelled ? '#f8f9fa' : 'transparent' }}>
                    <td style={styles.td}>
                      <div style={{fontSize: '11px', color: '#888'}}>{new Date(o.timestamp).toLocaleString()}</div>
                      {o.dateIn} ~ {o.dateOut}
                    </td>
                    <td style={styles.td}>{o.roomType}</td>
                    <td style={styles.td}>{o.name}<br/><span style={{fontSize: '12px'}}>{o.phone}</span></td>
                    <td style={styles.td}>
                      <strong style={{color: isCancelled ? '#888' : '#333'}}>NT$ {o.totalPrice?.toLocaleString() || 0}</strong>
                      {o.promoCode && <div style={{fontSize: '11px', color: '#dc3545'}}>代碼: {o.promoCode}</div>}
                    </td>
                    <td style={styles.td}>
                      <select 
                        style={{ ...styles.input, width: 'auto', padding: '5px', margin: 0, fontWeight: 'bold', color: o.status === '已付款' ? 'green' : o.status === '已入住' ? 'blue' : 'red' }}
                        value={o.status}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                      >
                        <option value="已付款">已付款 (待入住)</option>
                        <option value="已入住">已入住 (訂單完成)</option>
                        <option value="已取消">已取消 (退款處理)</option>
                      </select>
                    </td>
                    <td style={styles.td}>
                      <button style={{...styles.button, ...styles.buttonDanger, padding: '4px 8px'}} onClick={() => deleteOrder(o.id)}>刪除資料</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
