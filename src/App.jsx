import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';

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

// 定義房型價格
const ROOM_PRICES = {
  '標準雙人房': 2000,
  '豪華四人房': 3800,
  '家庭包棟': 12000
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
  infoBox: { backgroundColor: '#e9ecef', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#555', marginBottom: '15px' },
  promoBox: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '8px', padding: '15px', marginBottom: '20px' },
  promoTitle: { margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  promoTag: { backgroundColor: '#dc3545', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  priceBoard: { backgroundColor: '#f8f9fa', border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginTop: '15px', fontSize: '14px' },
  chatBox: { height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px', backgroundColor: '#fafafa' },
  bubbleUser: { backgroundColor: '#007bff', color: '#fff', padding: '10px', borderRadius: '15px', margin: '5px 0', alignSelf: 'flex-end', marginLeft: 'auto', width: 'fit-content', maxWidth: '80%' },
  bubbleAi: { backgroundColor: '#e9ecef', color: '#333', padding: '10px', borderRadius: '15px', margin: '5px 0', width: 'fit-content', maxWidth: '80%' },
  disclaimer: { fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '5px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left', fontSize: '14px' },
  td: { borderBottom: '1px solid #ddd', padding: '10px', fontSize: '14px' },
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
  const [form, setForm] = useState({ 
    dateIn: '', dateOut: '', roomType: '標準雙人房', 
    name: '', phone: '', paymentMethod: '信用卡', promoCode: '' 
  });
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '您好！我是 AI 客服。想知道房價或隱藏優惠嗎？' }]);
  const [chatInput, setChatInput] = useState('');
  const [paymentStep, setPaymentStep] = useState(false);
  
  // 查詢訂單用的狀態
  const [queryPhone, setQueryPhone] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);

  // 計算價格邏輯
  const calculatePrice = () => {
    if (!form.dateIn || !form.dateOut) return { nights: 0, base: 0, discount: 0, total: 0 };
    
    const d1 = new Date(form.dateIn);
    const d2 = new Date(form.dateOut);
    const timeDiff = d2.getTime() - d1.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (nights <= 0) return { nights: 0, base: 0, discount: 0, total: 0 };

    const basePrice = ROOM_PRICES[form.roomType] * nights;
    let discountAmt = 0;

    // 優惠規則判斷
    if (form.promoCode === 'SUMMER88' && form.roomType === '家庭包棟') {
      discountAmt = basePrice * 0.12; // 打 88 折 (折扣 12%)
    } else if (form.promoCode === 'AI500') {
      discountAmt = 500;
    }

    let total = basePrice - discountAmt;
    if (total < 0) total = 0;

    return { nights, base: basePrice, discount: discountAmt, total };
  };

  const priceData = calculatePrice();

  // 處理訂房
  const handleBookingInit = async (e) => {
    e.preventDefault();
    if (!form.dateIn || !form.dateOut || !form.name) return alert('資料不完整');
    if (priceData.nights <= 0) return alert('退房日期必須晚於入住日期');
    
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), where("roomType", "==", form.roomType), where("dateIn", "==", form.dateIn), where("status", "in", ["已付款", "待付款"]));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        alert('該房型在所選日期已被預訂');
        setLoading(false);
        return;
      }
      setPaymentStep(true);
    } catch(err) {
      alert("資料庫連線失敗，請檢查 Firestore 規則。");
    }
    setLoading(false);
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
      setQueryResults([]); 
      setHasQueried(false);
    } catch (error) {
      alert('系統寫入錯誤。');
    }
    setLoading(false);
  };

  // 假的 AI 客服邏輯 (Mock API)
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newHistory);
    const currentInput = chatInput;
    setChatInput(''); 

    setTimeout(() => {
      let aiText = "這部分的問題我還在學習中，如果是急事，請直接聯繫民宿老闆喔！"; 
      if (currentInput.includes("退費") || currentInput.includes("取消")) {
        aiText = "我們的退費政策是：入住前 7 天取消可全額退費，3 天前取消退還 50%。";
      } 
      else if (currentInput.includes("景點") || currentInput.includes("附近")) {
        aiText = "民宿附近有著名的老街跟生態農場，騎車大約 10 分鐘就可以抵達喔！";
      } 
      else if (currentInput.includes("規定") || currentInput.includes("時間")) {
        aiText = "入住時間為下午 15:00 後，退房為隔日上午 11:00 前。";
      }
      else if (currentInput.includes("優惠") || currentInput.includes("折扣") || currentInput.includes("便宜")) {
        aiText = "偷偷告訴你，現在結帳時輸入隱藏代碼『AI500』，住宿費可以直接折抵 500 元喔！家庭包棟的話可以輸入『SUMMER88』享 88 折！";
      }
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
    }, 1000); 
  };

  const handleQueryOrder = async (e) => {
    e.preventDefault();
    if (!queryPhone.trim()) return alert('請輸入聯絡電話');
    setLoading(true);
    setHasQueried(true);
    try {
      const q = query(collection(db, "bookings"), where("phone", "==", queryPhone));
      const snapshot = await getDocs(q);
      setQueryResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      alert("查詢失敗。");
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={styles.promoBox}>
        <h3 style={styles.promoTitle}>
          🎉 本月限定優惠活動 <span style={styles.promoTag}>HOT</span>
        </h3>
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

        <div style={{ ...styles.card, flex: 1, minWidth: '300px', marginBottom: 0 }}>
          <h3>線上訂房</h3>
          {!paymentStep ? (
            <form onSubmit={handleBookingInit}>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>入住日期</label>
                   <input type="date" style={styles.input} value={form.dateIn} onChange={e => setForm({...form, dateIn: e.target.value})} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>退房日期</label>
                   <input type="date" style={styles.input} value={form.dateOut} onChange={e => setForm({...form, dateOut: e.target.value})} required />
                 </div>
               </div>

               <label style={{ fontSize: '12px', color: '#666' }}>房型選擇</label>
               <select style={styles.input} value={form.roomType} onChange={e => setForm({...form, roomType: e.target.value})}>
                  <option value="標準雙人房">標準雙人房 (NT$ 2,000/晚)</option>
                  <option value="豪華四人房">豪華四人房 (NT$ 3,800/晚)</option>
                  <option value="家庭包棟">家庭包棟 (NT$ 12,000/晚)</option>
               </select>

               <label style={{ fontSize: '12px', color: '#666' }}>優惠代碼 (選填)</label>
               <input type="text" placeholder="若有折扣碼請輸入" style={styles.input} value={form.promoCode} onChange={e => setForm({...form, promoCode: e.target.value.toUpperCase()})} />

               {/* 即時金額試算看板 */}
               <div style={styles.priceBoard}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                   <span>住宿天數：</span><span>{priceData.nights} 晚</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                   <span>原價小計：</span><span>NT$ {priceData.base.toLocaleString()}</span>
                 </div>
                 {priceData.discount > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc3545', marginBottom: '5px' }}>
                     <span>優惠折抵 ({form.promoCode})：</span><span>- NT$ {priceData.discount.toLocaleString()}</span>
                   </div>
                 )}
                 <hr style={{ border: '0', borderTop: '1px solid #ccc', margin: '10px 0' }} />
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
                   <span>結帳總額：</span><span style={{ color: '#0056b3' }}>NT$ {priceData.total.toLocaleString()}</span>
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>訂購人姓名</label>
                   <input type="text" style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>聯絡電話</label>
                   <input type="text" style={styles.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
                 </div>
               </div>
               
               <label style={{ fontSize: '12px', color: '#666' }}>付款方式</label>
               <select style={styles.input} value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                  <option value="信用卡">信用卡</option>
                  <option value="LINE Pay">LINE Pay</option>
                  <option value="ATM 轉帳">ATM 轉帳</option>
               </select>

               <button type="submit" style={{...styles.button, width: '100%', marginTop: '10px'}}>前往結帳</button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h4>即將跳轉 {form.paymentMethod} 金流閘道</h4>
              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '15px 0', textAlign: 'left' }}>
                <p>房型：{form.roomType} ({priceData.nights} 晚)</p>
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

      {/* 訂單查詢 */}
      <div style={styles.card}>
        <h3>訂單查詢系統</h3>
        <form onSubmit={handleQueryOrder} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input type="text" placeholder="請輸入聯絡電話" style={{ ...styles.input, margin: 0, flex: 1 }} value={queryPhone} onChange={e => setQueryPhone(e.target.value)} />
          <button type="submit" style={styles.button}>查詢我的訂單</button>
        </form>
        {hasQueried && queryResults.length === 0 && <div style={{ textAlign: 'center', color: '#888' }}>查無訂房紀錄。</div>}
        {queryResults.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>入住 / 退房</th>
                <th style={styles.th}>房型 (天數)</th>
                <th style={styles.th}>總金額</th>
                <th style={styles.th}>狀態</th>
              </tr>
            </thead>
            <tbody>
              {queryResults.map(o => (
                <tr key={o.id}>
                  <td style={styles.td}>{o.dateIn} ~ {o.dateOut}</td>
                  <td style={styles.td}>{o.roomType} ({o.nights}晚)</td>
                  <td style={styles.td}>NT$ {o.totalPrice?.toLocaleString() || '---'}</td>
                  <td style={styles.td}><strong style={{ color: o.status === '已付款' ? 'green' : 'orange' }}>{o.status}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. 管理者端介面
// ==========================================
function AdminDashboard({ db, setLoading }) {
  const [orders, setOrders] = useState([]);
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      alert("讀取失敗。");
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const deleteOrder = async (id) => {
    if (window.confirm("確定刪除此訂單？")) {
      await deleteDoc(doc(db, "bookings", id));
      fetchOrders();
    }
  };

  return (
    <div style={styles.card}>
      <h3>訂單管理列表</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>日期</th>
              <th style={styles.th}>房型</th>
              <th style={styles.th}>客戶資訊</th>
              <th style={styles.th}>總金額</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={styles.td}>{o.dateIn} ~ {o.dateOut}</td>
                <td style={styles.td}>{o.roomType}</td>
                <td style={styles.td}>{o.name}<br/><span style={{fontSize: '12px'}}>{o.phone}</span></td>
                <td style={styles.td}>
                  NT$ {o.totalPrice?.toLocaleString() || '---'}
                  {o.promoCode && <><br/><span style={{fontSize: '11px', color: '#dc3545'}}>用券: {o.promoCode}</span></>}
                </td>
                <td style={styles.td}>
                  <button style={{...styles.button, ...styles.buttonDanger, padding: '4px 8px'}} onClick={() => deleteOrder(o.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
