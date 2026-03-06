import WidgetKit
import SwiftUI

// MARK: - Data Models

struct WatchedStreet: Codable, Identifiable {
    let id: String
    let name: String
    let status: Int
    let statusLabel: String
    let towingStatus: String  // "active" | "imminent" | "none"
    let towingLabel: String?
    let planifDate: String?
    let updatedAt: String?
}

struct WidgetData: Codable {
    let streets: [WatchedStreet]
    let lastRefresh: String?
}

// MARK: - Provider

struct Provider: TimelineProvider {
    static let appGroupId = "group.ca.alertedeneigement.app"

    func placeholder(in context: Context) -> StreetEntry {
        StreetEntry(date: Date(), streets: [
            WatchedStreet(id: "demo", name: "Rue Saint-Denis", status: 2, statusLabel: "Planifie", towingStatus: "imminent", towingLabel: "Remorquage imminent", planifDate: nil, updatedAt: nil)
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (StreetEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreetEntry>) -> Void) {
        let entry = loadEntry()
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> StreetEntry {
        guard let defaults = UserDefaults(suiteName: Provider.appGroupId),
              let jsonData = defaults.data(forKey: "widgetData"),
              let widgetData = try? JSONDecoder().decode(WidgetData.self, from: jsonData) else {
            return StreetEntry(date: Date(), streets: [])
        }
        return StreetEntry(date: Date(), streets: widgetData.streets)
    }
}

// MARK: - Entry

struct StreetEntry: TimelineEntry {
    let date: Date
    let streets: [WatchedStreet]
}

// MARK: - Views

struct StatusIcon: View {
    let status: Int

    var icon: String {
        switch status {
        case 1: return "snow"
        case 2: return "clock.fill"
        case 3: return "exclamationmark.triangle.fill"
        case 4: return "checkmark.circle.fill"
        case 5: return "nosign"
        default: return "questionmark.circle"
        }
    }

    var color: Color {
        switch status {
        case 1: return .gray
        case 2: return .orange
        case 3: return .red
        case 4: return .green
        case 5: return .yellow
        default: return .gray
        }
    }

    var body: some View {
        Image(systemName: icon)
            .foregroundColor(color)
    }
}

struct StreetRow: View {
    let street: WatchedStreet

    var body: some View {
        HStack(spacing: 6) {
            StatusIcon(status: street.status)
                .font(.system(size: 14))
                .frame(width: 18)

            VStack(alignment: .leading, spacing: 1) {
                Text(street.name)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)

                if street.towingStatus == "active" {
                    Text("Remorquage actif")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.red)
                } else if street.towingStatus == "imminent" {
                    Text("Remorquage imminent")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.orange)
                } else {
                    Text(street.statusLabel)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
    }
}

struct SmallWidgetView: View {
    let entry: StreetEntry

    var body: some View {
        if let street = entry.streets.first {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Alerte Neige")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.blue)
                    Spacer()
                }

                StatusIcon(status: street.status)
                    .font(.system(size: 24))

                Text(street.name)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(2)

                if street.towingStatus == "active" {
                    Text("Remorquage actif")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.red)
                } else if street.towingStatus == "imminent" {
                    Text("Remorquage imminent")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.orange)
                } else {
                    Text(street.statusLabel)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding()
        } else {
            VStack(spacing: 8) {
                Image(systemName: "snow")
                    .font(.system(size: 28))
                    .foregroundColor(.blue)
                Text("Ajoute une rue")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }
}

struct MediumWidgetView: View {
    let entry: StreetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Alerte Neige")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.blue)
                Spacer()
                if !entry.streets.isEmpty {
                    Text("\(entry.streets.count) rue\(entry.streets.count > 1 ? "s" : "")")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.bottom, 2)

            if entry.streets.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 6) {
                        Image(systemName: "snow")
                            .font(.system(size: 24))
                            .foregroundColor(.blue)
                        Text("Surveille une rue pour la voir ici")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                ForEach(entry.streets.prefix(3)) { street in
                    StreetRow(street: street)
                }
                Spacer(minLength: 0)
            }
        }
        .padding()
    }
}

// MARK: - Widget

@main
struct StreetStatusWidget: Widget {
    let kind: String = "StreetStatusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                Group {
                    switch WidgetFamily.allCases.first {
                    default:
                        SmallWidgetView(entry: entry)
                    }
                }
                .containerBackground(.fill.tertiary, for: .widget)
            } else {
                SmallWidgetView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Alerte Deneigement")
        .description("Statut de deneigement de tes rues surveillees")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
