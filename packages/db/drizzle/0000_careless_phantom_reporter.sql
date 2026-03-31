CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."part_status" AS ENUM('active', 'discontinued', 'pending');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('in_stock', 'low_stock', 'out_of_stock', 'discontinued');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"level" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "part_vehicle_compatibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"fitment_notes" text,
	"quantity_needed" integer DEFAULT 1,
	"position" varchar(100),
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"country" varchar(100),
	"website" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manufacturers_name_unique" UNIQUE("name"),
	CONSTRAINT "manufacturers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "oem_cross_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"cross_ref_oem_number" varchar(100) NOT NULL,
	"cross_ref_manufacturer" varchar(255),
	"cross_ref_type" varchar(50) DEFAULT 'equivalent' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oem_number" varchar(100) NOT NULL,
	"manufacturer_id" uuid NOT NULL,
	"category_id" uuid,
	"name" varchar(500) NOT NULL,
	"description" text,
	"specifications" jsonb,
	"weight_grams" integer,
	"dimensions" jsonb,
	"image_urls" text[],
	"status" "part_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"supplier_sku" varchar(100),
	"price_cents" integer,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"stock_status" "stock_status" DEFAULT 'in_stock' NOT NULL,
	"last_price_update" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"website" text,
	"country" varchar(100),
	"api_endpoint" text,
	"contact_email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_name_unique" UNIQUE("name"),
	CONSTRAINT "suppliers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_makes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"country" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_makes_name_unique" UNIQUE("name"),
	CONSTRAINT "vehicle_makes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"year_start" integer NOT NULL,
	"year_end" integer,
	"engine_code" varchar(50),
	"engine_displacement_cc" integer,
	"fuel_type" varchar(50),
	"body_type" varchar(100),
	"trim" varchar(255),
	"ktype_number" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_vehicle_compatibility" ADD CONSTRAINT "part_vehicle_compatibility_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_vehicle_compatibility" ADD CONSTRAINT "part_vehicle_compatibility_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oem_cross_references" ADD CONSTRAINT "oem_cross_references_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_parts" ADD CONSTRAINT "supplier_parts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_parts" ADD CONSTRAINT "supplier_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_make_id_vehicle_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_makes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_level_sort_idx" ON "categories" USING btree ("level","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "compatibility_part_vehicle_uniq" ON "part_vehicle_compatibility" USING btree ("part_id","vehicle_id","position");--> statement-breakpoint
CREATE INDEX "compatibility_part_id_idx" ON "part_vehicle_compatibility" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "compatibility_vehicle_id_idx" ON "part_vehicle_compatibility" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "compatibility_verified_idx" ON "part_vehicle_compatibility" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "manufacturers_slug_idx" ON "manufacturers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "oem_xref_part_id_idx" ON "oem_cross_references" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "oem_xref_oem_number_idx" ON "oem_cross_references" USING btree ("cross_ref_oem_number");--> statement-breakpoint
CREATE INDEX "oem_xref_oem_number_trgm_idx" ON "oem_cross_references" USING gin (cross_ref_oem_number gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "parts_oem_number_idx" ON "parts" USING btree ("oem_number");--> statement-breakpoint
CREATE INDEX "parts_manufacturer_id_idx" ON "parts" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "parts_category_id_idx" ON "parts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "parts_status_idx" ON "parts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "parts_oem_number_trgm_idx" ON "parts" USING gin (oem_number gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "parts_search_idx" ON "parts" USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')));--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_parts_supplier_part_uniq" ON "supplier_parts" USING btree ("supplier_id","part_id");--> statement-breakpoint
CREATE INDEX "supplier_parts_part_id_idx" ON "supplier_parts" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "supplier_parts_supplier_id_idx" ON "supplier_parts" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_parts_stock_status_idx" ON "supplier_parts" USING btree ("stock_status");--> statement-breakpoint
CREATE INDEX "vehicle_makes_slug_idx" ON "vehicle_makes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vehicle_models_make_id_idx" ON "vehicle_models" USING btree ("make_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_models_make_slug_uniq" ON "vehicle_models" USING btree ("make_id","slug");--> statement-breakpoint
CREATE INDEX "vehicles_model_id_idx" ON "vehicles" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "vehicles_year_range_idx" ON "vehicles" USING btree ("year_start","year_end");--> statement-breakpoint
CREATE INDEX "vehicles_engine_code_idx" ON "vehicles" USING btree ("engine_code");--> statement-breakpoint
CREATE INDEX "vehicles_ktype_idx" ON "vehicles" USING btree ("ktype_number");