import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Eye, Search, RotateCcw, DollarSign, Package, Calendar, AlertTriangle, Users } from "lucide-react";

function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}
async function apiGet(url: string) { const r = await fetchAuth(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url: string, body: any) { const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDel(url: string) { const r = await fetchAuth(url, { method: "DELETE" }); if (!r.ok && r.status !== 204) throw new Error(await r.text()); }

function fmt(n?: number) { return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ─── نافذة مرتجع جديد (مع بحث بالفاتورة) ─── */
function NewReturnDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<number, { selected: boolean; qty: number }>>({});
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const searchOrder = async () => {
    if (!invoiceSearch.trim()) return;
    setSearching(true);
    try {
      const data = await apiGet(`/api/orders/lookup?q=${encodeURIComponent(invoiceSearch.trim())}`);
      setFoundOrder(data);
      // تحديد جميع العناصر بالكمية الكاملة افتراضياً
      const sel: Record<number, { selected: boolean; qty: number }> = {};
      (data.items ?? []).forEach((item: any, idx: number) => {
        sel[idx] = { selected: true, qty: item.quantity };
      });
      setSelectedItems(sel);
    } catch (e: any) {
      setFoundOrder(null);
      toast({ variant: "destructive", title: "لم يتم العثور على الفاتورة", description: e.message });
    } finally {
      setSearching(false);
    }
  };

  const toggleItem = (idx: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [idx]: { ...prev[idx], selected: !prev[idx]?.selected },
    }));
  };

  const setQty = (idx: number, qty: number) => {
    const maxQty = foundOrder?.items?.[idx]?.quantity ?? 1;
    setSelectedItems(prev => ({
      ...prev,
      [idx]: { ...prev[idx], qty: Math.max(1, Math.min(qty, maxQty)) },
    }));
  };

  const selectedTotal = foundOrder?.items
    ? foundOrder.items.reduce((sum: number, item: any, idx: number) => {
        const sel = selectedItems[idx];
        if (!sel?.selected) return sum;
        return sum + item.unitPrice * (sel.qty ?? item.quantity);
      }, 0)
    : 0;

  const createMut = useMutation({
    mutationFn: () => {
      const items = (foundOrder?.items ?? [])
        .map((item: any, idx: number) => {
          const sel = selectedItems[idx];
          if (!sel?.selected) return null;
          return { product_id: item.productId, product_name: item.productName, quantity: sel.qty, unit_price: item.unitPrice };
        })
        .filter(Boolean);
      return apiPost("/api/returns", {
        invoice_number: foundOrder.invoiceNumber,
        order_id: foundOrder.id,
        reason,
        payment_method: paymentMethod,
        notes,
        items,
      });
    },
    onSuccess: () => {
      toast({ title: "تم إنشاء المرتجع بنجاح" });
      onSuccess();
      onClose();
      setFoundOrder(null);
      setInvoiceSearch("");
      setSelectedItems({});
      setReason("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل في إنشاء المرتجع", description: e.message }),
  });

  const canSubmit = foundOrder && !foundOrder.alreadyReturned && Object.values(selectedItems).some((s: any) => s.selected) && !createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" />مرتجع جديد</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* ── بحث بالفاتورة ── */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">البحث عن الفاتورة</h3>
            <div className="flex gap-2">
              <Input
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchOrder()}
                placeholder="أدخل رقم الفاتورة (مثال: 5 أو INV-0005)"
                className="flex-1"
              />
              <Button onClick={searchOrder} disabled={searching || !invoiceSearch.trim()} className="gap-1">
                <Search className="w-4 h-4" />{searching ? "جاري البحث..." : "بحث"}
              </Button>
            </div>

            {foundOrder && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className={`p-3 flex items-center justify-between ${foundOrder.alreadyReturned ? "bg-red-50" : "bg-green-50"}`}>
                  <div>
                    <div className="font-bold text-sm">{foundOrder.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      الكاشير: {foundOrder.cashierName} | {new Date(foundOrder.createdAt).toLocaleDateString("ar-SA")}
                    </div>
                    {foundOrder.customerName && <div className="text-xs text-muted-foreground">العميل: {foundOrder.customerName}</div>}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">{fmt(foundOrder.total)}</div>
                    {foundOrder.alreadyReturned && (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />تم إرجاعها
                      </Badge>
                    )}
                  </div>
                </div>

                {foundOrder.alreadyReturned && foundOrder.existingReturn && (
                  <div className="p-3 bg-red-50 border-t border-red-100 text-sm text-red-700">
                    تم إرجاع هذه الفاتورة مسبقاً برقم: {foundOrder.existingReturn.return_number} | المبلغ: {fmt(foundOrder.existingReturn.total_refund)}
                  </div>
                )}

                {!foundOrder.alreadyReturned && (
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">اختر الأصناف المرتجعة:</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-1 pr-1 w-8"></th>
                          <th className="text-right py-1">الصنف</th>
                          <th className="text-center py-1 w-20">الكمية</th>
                          <th className="text-left py-1 w-24">السعر</th>
                          <th className="text-left py-1 w-24">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(foundOrder.items ?? []).map((item: any, idx: number) => {
                          const sel = selectedItems[idx];
                          return (
                            <tr key={idx} className={`border-b border-dashed ${sel?.selected ? "" : "opacity-40"}`}>
                              <td className="py-1 pr-1">
                                <Checkbox checked={sel?.selected ?? false} onCheckedChange={() => toggleItem(idx)} />
                              </td>
                              <td className="py-1 font-medium">{item.productName}</td>
                              <td className="py-1 text-center">
                                <Input
                                  type="number"
                                  value={sel?.qty ?? item.quantity}
                                  min={1}
                                  max={item.quantity}
                                  disabled={!sel?.selected}
                                  onChange={e => setQty(idx, Number(e.target.value))}
                                  className="w-16 h-7 text-center text-sm mx-auto"
                                />
                              </td>
                              <td className="py-1 text-left font-mono text-xs">{fmt(item.unitPrice)}</td>
                              <td className="py-1 text-left font-mono font-bold text-xs text-destructive">
                                {fmt(item.unitPrice * (sel?.qty ?? item.quantity))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold">
                      <span>إجمالي المبلغ المسترد:</span>
                      <span className="text-destructive text-lg">{fmt(selectedTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── تفاصيل المرتجع ── */}
          {foundOrder && !foundOrder.alreadyReturned && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">سبب الإرجاع</label>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: منتج معيب" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">طريقة استرداد المبلغ</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="card">شبكة</SelectItem>
                    <SelectItem value="credit">رصيد للعميل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختيارية" className="mt-1" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => createMut.mutate()} disabled={!canSubmit} className="gap-2">
            <RotateCcw className="w-4 h-4" />تأكيد المرتجع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── نافذة تفاصيل المرتجع ─── */
function ViewReturnDialog({ ret, onClose }: { ret: any; onClose: () => void }) {
  if (!ret) return null;
  const pmLabel: Record<string, string> = { cash: "نقداً", card: "شبكة", credit: "رصيد للعميل" };
  return (
    <Dialog open={!!ret} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>تفاصيل المرتجع — {ret.return_number}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">رقم الفاتورة: </span><span className="font-medium">{ret.invoice_number}</span></div>
            <div><span className="text-muted-foreground">التاريخ: </span><span className="font-medium">{new Date(ret.created_at).toLocaleDateString("ar-SA")}</span></div>
            <div><span className="text-muted-foreground">السبب: </span><span className="font-medium">{ret.reason ?? "—"}</span></div>
            <div><span className="text-muted-foreground">طريقة الاسترداد: </span><span className="font-medium">{pmLabel[ret.payment_method] ?? ret.payment_method}</span></div>
            <div><span className="text-muted-foreground">الكاشير: </span><span className="font-medium">{ret.cashier_name}</span></div>
            {ret.notes && <div className="col-span-2"><span className="text-muted-foreground">ملاحظات: </span><span className="font-medium">{ret.notes}</span></div>}
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-2 font-semibold">المنتج</th>
                  <th className="text-right p-2 font-semibold">الكمية</th>
                  <th className="text-right p-2 font-semibold">السعر</th>
                  <th className="text-right p-2 font-semibold">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(ret.items ?? []).map((it: any) => (
                  <tr key={it.id}>
                    <td className="p-2">{it.product_name}</td>
                    <td className="p-2">{it.quantity}</td>
                    <td className="p-2 font-mono">{fmt(it.unit_price)}</td>
                    <td className="p-2 font-mono text-destructive font-semibold">{fmt(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-2 font-bold text-lg">
            <span>إجمالي المبلغ المسترد:</span>
            <span className="text-destructive">{fmt(ret.total_refund)}</span>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>إغلاق</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── صناديق الكاشيرين ─── */
function CashierBoxes() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const { data, isLoading } = useQuery({
    queryKey: ["cashier-boxes", date],
    queryFn: () => apiGet(`/api/cashier-boxes?date=${date}`),
  });

  const box = (data as any)?.mainBox;
  const cashiers = (data as any)?.cashiers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">تاريخ الصندوق:</label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <>
          {/* الصندوق الرئيسي */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-2 border-primary/30 col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />الصندوق الرئيسي — {date}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
                    <div className="text-xl font-bold text-primary">{fmt(box?.total)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">إجمالي المرتجعات</div>
                    <div className="text-xl font-bold text-destructive">-{fmt(box?.returnsTotal)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">الصافي</div>
                    <div className="text-2xl font-black text-green-600">{fmt(box?.net)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* صناديق الكاشيرين */}
          <div>
            <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />صناديق الكاشيرين
            </h3>
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-right p-3 font-semibold">الكاشير</th>
                    <th className="text-right p-3 font-semibold">المبيعات</th>
                    <th className="text-right p-3 font-semibold">عدد الفواتير</th>
                    <th className="text-right p-3 font-semibold">المرتجعات</th>
                    <th className="text-right p-3 font-semibold">الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cashiers.map((c: any) => (
                    <tr key={c.userId} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 font-mono text-primary">{fmt(c.ordersTotal)}</td>
                      <td className="p-3 text-center">{c.ordersCount}</td>
                      <td className="p-3 font-mono text-destructive">-{fmt(c.returnsTotal)}</td>
                      <td className="p-3 font-mono font-bold text-green-700">{fmt(c.net)}</td>
                    </tr>
                  ))}
                  {cashiers.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد بيانات لهذا اليوم</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Returns() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [viewRet, setViewRet] = useState<any>(null);

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (search) params.set("search", search);

  const { data: returns_ = [], isLoading } = useQuery({ queryKey: ["returns", startDate, endDate, search], queryFn: () => apiGet(`/api/returns?${params}`) });
  const { data: summary } = useQuery({ queryKey: ["returns-summary"], queryFn: () => apiGet("/api/returns-summary") });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/returns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); qc.invalidateQueries({ queryKey: ["returns-summary"] }); toast({ title: "تم الحذف" }); },
    onError: () => toast({ variant: "destructive", title: "فشل في الحذف" }),
  });

  const pmLabel: Record<string, string> = { cash: "نقداً", card: "شبكة", credit: "رصيد" };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">نظام المرتجعات</h1>
          <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="w-4 h-4" />مرتجع جديد</Button>
        </div>

        <Tabs defaultValue="returns">
          <TabsList>
            <TabsTrigger value="returns">المرتجعات</TabsTrigger>
            <TabsTrigger value="boxes">الصناديق</TabsTrigger>
          </TabsList>

          <TabsContent value="returns" className="space-y-4 mt-4">
            {/* إحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />مرتجعات اليوم</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(summary as any)?.todayCount ?? 0}</div>
                  <div className="text-sm text-destructive font-mono">{fmt((summary as any)?.todayTotal)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />مرتجعات الشهر</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(summary as any)?.monthCount ?? 0}</div>
                  <div className="text-sm text-destructive font-mono">{fmt((summary as any)?.monthTotal)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />إجمالي المرتجعات</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{(summary as any)?.totalCount ?? 0}</div></CardContent>
              </Card>
            </div>

            {/* فلاتر */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم الفاتورة..." className="w-48" />
              </div>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
              {(startDate || endDate || search) && (
                <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setSearch(""); }}>مسح</Button>
              )}
            </div>

            {/* جدول المرتجعات */}
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-right p-3 font-semibold">رقم المرتجع</th>
                      <th className="text-right p-3 font-semibold">رقم الفاتورة</th>
                      <th className="text-right p-3 font-semibold">التاريخ</th>
                      <th className="text-right p-3 font-semibold">السبب</th>
                      <th className="text-right p-3 font-semibold">الاسترداد</th>
                      <th className="text-right p-3 font-semibold">المبلغ</th>
                      <th className="text-right p-3 font-semibold">الكاشير</th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(returns_ as any[]).map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs text-primary">{r.return_number}</td>
                        <td className="p-3 font-mono text-xs">{r.invoice_number}</td>
                        <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar-SA")}</td>
                        <td className="p-3">{r.reason ?? "—"}</td>
                        <td className="p-3"><Badge variant="outline">{pmLabel[r.payment_method] ?? r.payment_method}</Badge></td>
                        <td className="p-3 font-mono font-bold text-destructive">{fmt(r.total_refund)}</td>
                        <td className="p-3 text-muted-foreground">{r.cashier_name}</td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => setViewRet(r)}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm(`حذف المرتجع ${r.return_number}؟`) && delMut.mutate(r.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(returns_ as any[]).length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد مرتجعات</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="boxes" className="mt-4">
            <CashierBoxes />
          </TabsContent>
        </Tabs>

        <NewReturnDialog
          open={showNew}
          onClose={() => setShowNew(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ["returns"] }); qc.invalidateQueries({ queryKey: ["returns-summary"] }); }}
        />
        <ViewReturnDialog ret={viewRet} onClose={() => setViewRet(null)} />
      </div>
    </AdminLayout>
  );
}
