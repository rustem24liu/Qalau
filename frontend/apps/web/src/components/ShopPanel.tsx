import { REWARD, SHOP, roofOf, type ShopItem } from "@qalau/core";
import { useState } from "react";
import { useStore } from "../store";

const GROUPS: { kind: ShopItem["kind"]; title: string }[] = [
  { kind: "freeze", title: "Защита серии" },
  { kind: "decor", title: "Украшения площади" },
  { kind: "roof", title: "Цвет крыш" },
];

/** Spend coins: streak freezes, plaza decorations, roof colors. */
export function ShopPanel() {
  const wallet = useStore(s => s.state.wallet);
  const { buy, setRoof, showToast } = useStore.getState();
  const [flash, setFlash] = useState<string | null>(null);

  const onBuy = (item: ShopItem) => {
    const res = buy(item.id);
    if (res === "ok") showToast(item.kind === "decor" ? `«${item.name}» теперь в вашем городе` : `Куплено: ${item.name}`);
    else if (res === "poor") { setFlash(item.id); setTimeout(() => setFlash(null), 900); }
  };

  return (
    <section className="shop">
      <div className="shop-head">
        <div>
          <h2>Магазин</h2>
          <p className="sub">Монеты за работу: задача +{REWARD.task}, хижина +{REWARD.hut}, неделя серии +{REWARD.streakWeek}, каждые 5 минут фокуса +{REWARD.focus5}, перерыв +{REWARD.rest}, новый уровень города +{REWARD.level}.</p>
        </div>
        <div className="shop-balance"><span className="coin" aria-hidden="true" />{wallet.coins}</div>
      </div>
      {GROUPS.map(gr => (
        <div key={gr.kind} className="shop-group">
          <div className="lbl">{gr.title}</div>
          <div className="shop-grid">
            {SHOP.filter(i => i.kind === gr.kind).map(item => {
              const owned = item.kind !== "freeze" && wallet.owned.includes(item.id);
              const roof = roofOf(item.id), wearing = roof !== null && wallet.roof === roof;
              return (
                <div key={item.id} className={"shop-item" + (owned ? " owned" : "") + (flash === item.id ? " poor" : "")}>
                  <b>{item.name}</b>
                  <span className="sub">{item.desc}</span>
                  {item.kind === "freeze" && <span className="stock">В запасе: {wallet.freezes}</span>}
                  <div className="shop-actions">
                    {!owned ? (
                      <button className="btn" type="button" onClick={() => onBuy(item)} disabled={wallet.coins < item.price}>
                        <span className="coin" aria-hidden="true" />{item.price}
                      </button>
                    ) : roof ? (
                      <button className="btn ghost" type="button" onClick={() => setRoof(wearing ? null : roof)}>{wearing ? "Снять" : "Надеть"}</button>
                    ) : (
                      <span className="stock">В городе</span>
                    )}
                    {wallet.coins < item.price && !owned && <span className="stock">не хватает {item.price - wallet.coins}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
