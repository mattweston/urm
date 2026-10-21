import { defineRelations } from "drizzle-orm"
import * as schema from "./index.ts"

export const relations = defineRelations(schema, (r) => ({
    contacts: {
        preferences: r.many.preferences({
            from: r.contacts.id,
            to: r.preferences.contact_id,
        }),
        carts: r.many.carts({
            from: r.contacts.id,
            to: r.carts.contactId,
        }),
        shopCustomers: r.many.customers({
            from: r.contacts.id,
            to: r.customers.contactId,
        }),
        createdTodoItems: r.many.todo_list_items({
            from: r.contacts.id,
            to: r.todo_list_items.createdByContactId,
        }),
        assignedTodoItems: r.many.todo_list_items({
            from: r.contacts.id,
            to: r.todo_list_items.assigneeContactId,
        }),
        emailDeliveries: r.many.email_deliveries({
            from: r.contacts.id,
            to: r.email_deliveries.contact_id,
        }),
        emailSubscriptions: r.many.email_subscriptions({
            from: r.contacts.id,
            to: r.email_subscriptions.contact_id,
        }),
        createdNewsletterSends: r.many.email_newsletter_sends({
            from: r.contacts.id,
            to: r.email_newsletter_sends.created_by_contact_id,
        }),
    },

    preferences: {
        contact: r.one.contacts({
            from: r.preferences.contact_id,
            to: r.contacts.id,
        }),
    },

    tags: {
        entityTags: r.many.entity_tags({
            from: r.tags.id,
            to: r.entity_tags.tag_id,
        }),
    },

    entity_tags: {
        tag: r.one.tags({
            from: r.entity_tags.tag_id,
            to: r.tags.id,
        }),
    },

    products: {
        variants: r.many.product_variants({
            from: r.products.id,
            to: r.product_variants.productId,
        }),
        cartItems: r.many.cart_items({
            from: r.products.id,
            to: r.cart_items.productId,
        }),
        orderItems: r.many.order_items({
            from: r.products.id,
            to: r.order_items.productId,
        }),
    },

    product_variants: {
        product: r.one.products({
            from: r.product_variants.productId,
            to: r.products.id,
        }),
        cartItems: r.many.cart_items({
            from: r.product_variants.id,
            to: r.cart_items.productVariantId,
        }),
        orderItems: r.many.order_items({
            from: r.product_variants.id,
            to: r.order_items.productVariantId,
        }),
    },

    product_collections: {},

    customers: {
        contact: r.one.contacts({
            from: r.customers.contactId,
            to: r.contacts.id,
        }),
        carts: r.many.carts({
            from: r.customers.id,
            to: r.carts.customerId,
        }),
        orders: r.many.orders({
            from: r.customers.id,
            to: r.orders.customerId,
        }),
        emailNotifications: r.many.email_notifications({
            from: r.customers.id,
            to: r.email_notifications.customer_id,
        }),
    },

    carts: {
        contact: r.one.contacts({
            from: r.carts.contactId,
            to: r.contacts.id,
        }),
        customer: r.one.customers({
            from: r.carts.customerId,
            to: r.customers.id,
        }),
        items: r.many.cart_items({
            from: r.carts.id,
            to: r.cart_items.cartId,
        }),
    },

    cart_items: {
        cart: r.one.carts({
            from: r.cart_items.cartId,
            to: r.carts.id,
        }),
        product: r.one.products({
            from: r.cart_items.productId,
            to: r.products.id,
        }),
        variant: r.one.product_variants({
            from: r.cart_items.productVariantId,
            to: r.product_variants.id,
        }),
    },

    orders: {
        customer: r.one.customers({
            from: r.orders.customerId,
            to: r.customers.id,
        }),
        items: r.many.order_items({
            from: r.orders.id,
            to: r.order_items.orderId,
        }),
        payments: r.many.payments({
            from: r.orders.id,
            to: r.payments.orderId,
        }),
        emailNotifications: r.many.email_notifications({
            from: r.orders.id,
            to: r.email_notifications.order_id,
        }),
    },

    order_items: {
        order: r.one.orders({
            from: r.order_items.orderId,
            to: r.orders.id,
        }),
        product: r.one.products({
            from: r.order_items.productId,
            to: r.products.id,
        }),
        variant: r.one.product_variants({
            from: r.order_items.productVariantId,
            to: r.product_variants.id,
        }),
    },

    payments: {
        order: r.one.orders({
            from: r.payments.orderId,
            to: r.orders.id,
        }),
    },

    csv_uploads: {
        rows: r.many.csv_data({
            from: r.csv_uploads.id,
            to: r.csv_data.upload_id,
        }),
    },

    csv_data: {
        upload: r.one.csv_uploads({
            from: r.csv_data.upload_id,
            to: r.csv_uploads.id,
        }),
    },

    email_notifications: {
        order: r.one.orders({
            from: r.email_notifications.order_id,
            to: r.orders.id,
        }),
        customer: r.one.customers({
            from: r.email_notifications.customer_id,
            to: r.customers.id,
        }),
    },

    email_deliveries: {
        contact: r.one.contacts({
            from: r.email_deliveries.contact_id,
            to: r.contacts.id,
        }),
        newsletterSend: r.one.email_newsletter_sends({
            from: r.email_deliveries.newsletter_send_id,
            to: r.email_newsletter_sends.id,
        }),
    },

    email_subscriptions: {
        contact: r.one.contacts({
            from: r.email_subscriptions.contact_id,
            to: r.contacts.id,
        }),
    },

    email_newsletter_sends: {
        createdByContact: r.one.contacts({
            from: r.email_newsletter_sends.created_by_contact_id,
            to: r.contacts.id,
        }),
        deliveries: r.many.email_deliveries({
            from: r.email_newsletter_sends.id,
            to: r.email_deliveries.newsletter_send_id,
        }),
    },
}))
