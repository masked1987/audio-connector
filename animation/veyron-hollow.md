# Veyron Hollow: animation project

The owner's animated story. All characters, places and gear are saved in the
owner's **Higgsfield** account as reusable "elements" (Higgsfield MCP tool
`manage_reference_elements`). To use one in an image or video, put
`<<<element_id>>>` in the prompt.

Rules the owner set:
- Nothing gets generated (no credits spent) until the owner says so, and the
  price is said first. Balance on 2026-10-31: 181.5 credits after the Zac-meets-Tex flashback, Pro plan.
- Element names can't be changed once saved, so confirm full names first.
- Every character has a first and last name.
- Video settings: use only **Seedance 2.0, Seedance 2.5 or Kling 4.0**, at
  **480p**, in **9:16** (vertical). Don't pick other models or sizes.
  Kling 4.0 has no 480p; its lowest is 720p. Saved elements (`<<<id>>>` in the
  prompt) are only listed as working with Seedance 2.0 of these three.
  Prices checked 2026-10-31 for a 10-second 9:16 clip: Seedance 2.0 std 480p
  30 credits, Seedance 2.0 fast 480p 10, Seedance 2.5 480p 30, Kling 4.0 720p
  22.5.

## How the owner wants scenes made (feedback 2026-10-31)

- **Mixed, changing expressions.** Faces should not hold one steady look. Use
  combinations and changes within a shot whenever there's a chance: amazed and
  scared, happy and sad, shy then proud, nervous then relieved. Write the
  change into the prompt (e.g. "his face shifts from fear to wonder").
- **Match the owner's own art style.** The first flashback came out looking
  like a 2D painted storybook, which is "completely different" from the
  owner's pictures. The owner's style is a clean stylized 3D character render
  (soft studio-like light, real material textures: knit, leather, denim,
  metal), like their character sheets. Don't write "painterly" in prompts.
  Before animating, compare each start picture side by side with the owner's
  sheet for that character and redo it if the look differs.
- **No staring into the camera, no empty moments.** In shot 1 Zac just looked
  at the viewer from behind a box; the owner found it empty. Every shot needs a
  reason and an action tied to the story and characters.
- **Normal speed, not slow motion.** The first flashback felt slow-motion. Ask
  for real-time, lively movement in the prompt. Seedance 2.0 jobs showed a
  `speedramp: "auto"` setting; check whether it can be turned off.
- **Use the owner's references exactly.** Generated start pictures drift from
  the owner's art. Saved elements only send their first picture to the video
  model, so pass the owner's own sheet pictures directly as references (and
  use the owner's own pictures as start frames where possible) instead of
  making new look-alike pictures.
- **Less generic stories.** Build scenes from who the characters are (Tex warm
  but grumpy, Zac serious and guarded) and from the world, not stock beats.
- The owner may connect ChatGPT to work alongside Claude.

## The world

- **Veyron Hollow**: a gothic, industrial city with canals, bridges and chimneys,
  shown in a painterly style.
- **The Raven's Rest**: the bar, owned by Vivienne Rook. Its motto is "Good
  company, better stories." No pictures of it yet.
- **Tex's Forge**: Tex Brannock's blacksmith shop on the docks.
- **Xilas Crane's casino**: no pictures yet.
- **Dr. Caspian Malakai's laboratory**: no pictures yet.

## Who looks after whom

Decided 2026-10-31. The kids take their caretaker's last name.

- Caleb Brooks looks after **King Brooks**
- Evelyn Hale looks after **Zac Hale**
- Jax Dorran looks after **Mara Dorran**

Other ties:
- Tex Brannock becomes Zac's close friend later on (the owner thought about
  Tex as Zac's caretaker but chose Evelyn). Zac met Tex once when he was
  little and was amazed by Tex's craftsmanship. Tex laughed and gave him a gift:
  the brass wheel charm Zac carries as his "forge keepsake".

## Characters (Higgsfield element IDs)

### Kids

Full names: **King Brooks, Zac Hale, Mara Dorran**. The elements below were
saved before the last names were chosen, so their saved names are short
("Zac", "King", "Mara ..."); names can't be changed, so leave them.

| Name | Element ID | Notes |
|---|---|---|
| Zac | 2a5490cc-db64-4511-ae13-74ef65ee6bc3 | Zac Hale. Teen boy, orange hoodie, olive jacket. |
| King | 4b096340-bbd7-4c36-a6a9-595d927d3ec0 | King Brooks. Teen boy, navy vest with crown emblem. Smooth 3D look. |
| Mara (teen) | df66fa86-91b3-4edb-998c-da079ba605e1 | Mara Dorran. Smooth 3D look. |
| Mara (age 7) | 2076f1bf-b0d5-4b57-acf9-c5821437951a | Young Mara. |
| Mara (adult) | 77623996-8d70-4c8a-a30f-1b239e8bb8e8 | Teal hooded coat. |
| King Brooks (adult) | 5f053787-3ddc-4b96-a793-2fd595fed22e | Saved as "King-Brooks-Adult". Royal blue cropped jacket, crown on the sleeve, cargo capris with orange stripe, black zip boots. Body sheets look 3D, face sheets painterly. |
| Zac Hale (adult) | a167a245-1fc9-4298-82d1-fa60aa226204 | Saved as "Zac-Hale-Adult". Painterly. Orange hoodie, chain, black distressed jacket with orange patch, amber eyes. |
| King Brooks (age 10) | c2ce8c76-06ef-441c-ad7d-29a3c15b03ad | Saved as "King-Brooks-Age-10". Smooth 3D. Denim jacket with crown on the chest pocket, cargo shorts, same zip boots as adult King. |
| Zac Hale (age 10) | a8fc5713-4b18-4c75-9aee-67a70c826ce7 | Saved as "Zac-Hale-Age-10". Green knit sweater with elbow patches, satchel with a brass wheel "forge keepsake" charm, notebook with a city map. Freckles. |

### Heroes and townsfolk

| Name | Element ID | Role |
|---|---|---|
| Caleb Brooks | 061df7ef-9625-44d4-97cd-7b3386b125d4 | King's caretaker |
| Evelyn Hale | aae309f4-6fe2-43ae-a86d-4ef429fa3fed | Zac's caretaker; kind, motherly |
| Jax Dorran | 105c2253-a7f2-4138-a01a-474c064a6829 | Mara's caretaker. **Partly blind**: sees only up close, walks with a cane |
| Tex Brannock | f41069a9-4f43-488e-a228-427d720c195a | Blacksmith, owns Tex's Forge. Becomes Zac's close friend later on |
| Vivienne Rook | 7286a01e-1261-45c4-b692-e7f6026cd7b1 | Owns the Raven's Rest |
| Tobin Rook | e459f236-daee-4d81-95ff-44eeb47c5fb7 | "The survivor". Shares a last name with Vivienne; family link not decided yet |
| Lucan Vale | 2f692fbd-2409-406b-8ab5-bc8f48873a20 | Dark coat, red cape, star badge |
| Commander Aldric Sterling | e11bb876-4cdc-4979-8e5d-0b9e54b5d224 | Military commander; mask on or off |

### Villains and their people

| Name | Element ID | Role |
|---|---|---|
| Dr. Caspian Malakai | 345cbe4e-9045-45bd-9095-075a0bfcca1b | Sinister scientist, main villain |
| Xilas Crane | ad99b9af-b484-4113-bbf3-fb8293ade9e2 | Casino owner, information broker, works with Malakai. **Use this one, not the old "Xilas" element (c56574b7-…).** |
| Lyra Voss | c6d3d5e9-470a-4b5b-94bb-b4728f611829 | Malakai's lab assistant |
| Garrick Holt | efb73e41-c95f-4f3f-ad41-c7182840f256 | Xilas's enforcer at the casino |
| Magnus Valcrest | 8cde05a7-76f6-4aaa-bf28-b2948e4667e6 | Rich investor; casino or Malakai's research, not decided yet |

## Places

| Name | Element ID |
|---|---|
| Tex's Forge, outside | 60cbbff6-e650-4601-9022-c41d165983ec |
| Tex's Forge, inside | a8e928c5-9648-4e53-81c9-9d97bfe1bae7 |

## Weapons and gear

| Name | Element ID |
|---|---|
| Xilas's needle grenade | 34232fcc-d8e7-45fa-9b90-8b2f0f5a46db |
| Lyra's filter mask | 5efe6896-24b1-44c7-b9f2-a2faa76032e6 |
| Lyra's war fan | 0bb909ce-19f5-4846-807a-7b691230d749 |
| Toxin needle launcher | 28dc678f-6f61-486e-8779-95b9f133f879 |
| Heated sword | a8d6733d-d2e5-4377-a675-68f2103d5fcd |
| Combat gauntlets | a4e62d71-7aa8-451c-9f4c-e5a4051ea1c8 |
| Heavy hammer | 149843fc-5620-47fa-acf7-1ff1735d2192 |

Uploaded to Higgsfield as pictures but not saved as elements: two Veyron Hollow
city maps and one equipment sheet (boots, filter mask, gas canister, steel
gauntlets).

## Open questions

- Are Tobin and Vivienne Rook family?
- Magnus Valcrest: tied to the casino or to Malakai's research?
- Art style: Mara (teen) and King are smooth 3D; most others are painterly.
  Pick one style per video.
- An old "Lyra version" on the needle-launcher sheet has red hair; use the
  saved Lyra Voss instead.

## Scene ideas

### Flashback: little Zac meets Tex (made 2026-10-31)

Owner wants top quality motion and control, characters and background kept
true to the saved elements; shot length is up to Claude. Plan (2026-10-31):
6 shots of 5 s, about 30 s in total, made in two steps, each needing its own yes.

- Step 1, start pictures: one 9:16 picture per shot with Nano Banana Pro using
  the saved elements, 2 credits each = 12 credits. Owner checks them first.
- Step 2, videos: Seedance 2.0 **std**, 480p, 9:16, with sound, each picture
  as the start frame, 15 credits per 5 s shot = 90 credits.
- Total about 102 credits (cheaper fast-mode videos: 30 + 12 = 42).
- Seedance 2.0 shots are 4 to 15 s; 3 s is not possible.

Made on 2026-10-31 with the owner's go-ahead; cost exactly 102 credits.
Joined 30-second video: `animation/zac-meets-tex-flashback.mp4`.
Higgsfield video jobs, shots 1-6: aae26bda-6a39-496c-af41-fb1d9b7773bf,
2f56520b-c16d-41f1-86a9-ca218503e3fd, 70431c33-2d5c-47a3-a6b4-ab6c21a0a9cf,
045ee568-9567-4ee6-b2d2-8ceaa767ec4a, e3a0cc8a-aa44-47d5-8b04-d24c90b73b70,
5ae6796f-2d1c-4c6e-93e5-10c2835f9ca8. Start pictures: 2a27e960, 5be4c725,
f794d3a6, dcd3c98c, 4f69b040, 8dcf453f (same job-id prefixes).
Owner feedback: the look is too different from their own art style, and faces
should show more mixed emotions. Known flaw: in shot 6 the charm briefly vanishes from Zac's palm before he
closes his hand. Dialogue not checked by ear yet (Gemini key was out of quota).
How-to that worked: Seedance 2.0 batch needs `declined_preset_id` when
Higgsfield suggests a preset instead of submitting; only about 5 Seedance jobs
run at once (a 6th gets "rate_limit_reached" until one finishes).

Elements: Zac-Hale-Age-10, Tex-Brannock, Texs-Forge-Outside, Texs-Forge-Inside,
Heated-Sword.

1. Outside at dusk. Zac hides behind crates by the open forge doors, peeking at
   the glow and sparks. Zac whispers: "Whoa..."
2. Inside. Tex hammers the glowing Heated Sword on the anvil, sparks flying.
   Without turning: "You can come in, you know. I don't bite."
3. Zac steps shyly through the doorway, eyes wide, and creeps toward the anvil.
4. Tex plunges the blade into the water trough; steam hisses. Zac: "How do you
   make it shine like that?"
5. Tex grins: "Fire, patience, and a stubborn arm." He laughs and picks a small
   brass wheel charm off his workbench.
6. Close-up. Tex puts the charm in Zac's hand: "Keep it, little one. Every
   smith starts somewhere." Zac holds it tight and smiles.
