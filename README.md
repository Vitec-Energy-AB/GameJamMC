# 🎮 GitHub Copilot Game Jam

## 🎯 Uppgift

Skapa ett valfritt spel genom att använda GitHub Copilot i GitHub – Team.
Du kommer att interagera med en AI-agent som genererar kod via commits baserat på dina prompts.

---

## 🛠️ Agentinstruktioner (Systemprompt) <!-- EDITABLE -->

> ⚠️ **REDIGERBAR SEKTION**
> Detta avsnitt kan ändras **innan agenten startas** för att styra AI-agentens beteende.

Exempel på vad du kan ändra:

* Spelidé eller tema 🎨
* Ton/stil för koden ✍️
* Programmeringsspråk eller ramverk 💻
* Specifika features som ska påverka AI-agenten 🕹️
* **Sätt din branch här:** `BRANCH_NAME=<din-branch>`

**Justera här innan start:**

```md
Aktiv branch: main=game-branch
Agenten ska skapa ett 2D-plattformsspel i Python med Pygame. Koden ska vara modulär och kommenterad på svenska.
```

---

## 📜 Basinstruktioner (Får ej ändras) <!-- LOCKED -->

> 🔒 **LÅST SEKTION – ÄNDRA INTE**

* Utgå alltid från den branch som anges i systemprompten (`BRANCH_NAME`).
* `README.md` får **endast ändras innan agenten startas**.
* Agentens uppgift är att skapa spelrelaterad kod via commits.
* Varje prompt skickad till agenten ska generera **en commit**.
* Commit-meddelandet ska vara exakt samma som prompten.

---

## 💡 Prompt-regler <!-- LOCKED -->

> 🔒 **LÅST SEKTION – ÄNDRA INTE**

* Max **10 prompts** per projekt.
* Varje prompt ska tydligt beskriva en funktion, feature eller ändring i spelet.
* Agentens commits ska reflektera prompten och uppfylla systeminstruktionerna.

*Exempel på prompt som blir commit-meddelande:*

```md
Lägg till en spelare som kan hoppa och röra sig åt vänster och höger.
```

---

## 🏁 Starta agenten <!-- LOCKED -->

> 🔒 **LÅST SEKTION – ÄNDRA INTE**

1. Justera systemprompten (Agentinstruktioner), inklusive `BRANCH_NAME`.
2. Spara `README.md`.
3. Starta Copilot-agenten.
4. Skicka prompts som commit-meddelanden, upp till 10 gånger.
5. Kontrollera att koden fungerar och spelet byggs stegvis.

---

## 🔗 Tips <!-- LOCKED -->

> 🔒 **LÅST SEKTION – ÄNDRA INTE**

* Håll prompts enkla men tydliga.
* Testa varje commit innan du skickar nästa prompt.
* Använd beskrivande namn på funktioner och variabler.
